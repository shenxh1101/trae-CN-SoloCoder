#!/usr/bin/env python3
import os
import shutil
import tempfile
import time
import threading
import json
import unittest

from foldersync.file_utils import scan_directory, compute_file_md5, copy_file
from foldersync.sync_engine import SyncEngine, ActionType, SyncAction
from foldersync.config import (
    SyncRule,
    SyncConfig,
    load_config,
    load_last_sync_time,
    save_last_sync_time,
    DEFAULT_EXCLUDES,
)
from foldersync.report import SyncReport, preview_actions
from foldersync.scheduler import Scheduler

STATE_DIR = os.path.expanduser("~/.foldersync/state")


class TestMD5DiffDetection(unittest.TestCase):
    def setUp(self):
        self.src = tempfile.mkdtemp(prefix="fsync_md5_src_")
        self.dst = tempfile.mkdtemp(prefix="fsync_md5_dst_")

    def tearDown(self):
        shutil.rmtree(self.src, ignore_errors=True)
        shutil.rmtree(self.dst, ignore_errors=True)

    def test_same_content_different_mtime_skip(self):
        with open(os.path.join(self.src, "same.txt"), "w") as f:
            f.write("identical content")
        os.makedirs(os.path.join(self.dst), exist_ok=True)
        with open(os.path.join(self.dst, "same.txt"), "w") as f:
            f.write("identical content")
        time.sleep(0.05)
        os.utime(os.path.join(self.dst, "same.txt"), (time.time(), time.time()))

        rule = SyncRule(
            name="md5-test",
            source=self.src,
            target=self.dst,
            mode="unidirectional",
            excludes=[],
            use_md5=True,
            max_workers=2,
        )
        engine = SyncEngine(rule=rule)
        actions = engine.plan()

        same_actions = [a for a in actions if a.rel_path == "same.txt"]
        self.assertEqual(len(same_actions), 1)
        self.assertEqual(same_actions[0].action_type, ActionType.SKIP)
        self.assertIn("identical", same_actions[0].reason)

    def test_different_content_same_size_md5_detects(self):
        with open(os.path.join(self.src, "data.txt"), "w") as f:
            f.write("content A!!!!")
        with open(os.path.join(self.dst, "data.txt"), "w") as f:
            f.write("content B!!!!")

        rule = SyncRule(
            name="md5-diff-test",
            source=self.src,
            target=self.dst,
            mode="unidirectional",
            excludes=[],
            use_md5=True,
            max_workers=2,
        )
        engine = SyncEngine(rule=rule)
        actions = engine.plan()

        diff_actions = [a for a in actions if a.rel_path == "data.txt"]
        self.assertEqual(len(diff_actions), 1)
        self.assertEqual(diff_actions[0].action_type, ActionType.OVERWRITE)

    def test_no_md5_uses_mtime(self):
        with open(os.path.join(self.src, "same.txt"), "w") as f:
            f.write("identical content")
        with open(os.path.join(self.dst, "same.txt"), "w") as f:
            f.write("identical content")
        time.sleep(0.05)
        os.utime(os.path.join(self.dst, "same.txt"), (time.time() + 100, time.time() + 100))

        rule = SyncRule(
            name="nomd5-test",
            source=self.src,
            target=self.dst,
            mode="unidirectional",
            excludes=[],
            use_md5=False,
            max_workers=2,
        )
        engine = SyncEngine(rule=rule)
        actions = engine.plan()

        same_actions = [a for a in actions if a.rel_path == "same.txt"]
        self.assertEqual(len(same_actions), 1)
        self.assertEqual(same_actions[0].action_type, ActionType.OVERWRITE)

    def test_bidirectional_md5_identical_skip(self):
        with open(os.path.join(self.src, "file.txt"), "w") as f:
            f.write("shared content")
        with open(os.path.join(self.dst, "file.txt"), "w") as f:
            f.write("shared content")
        time.sleep(0.05)
        os.utime(os.path.join(self.dst, "file.txt"), (time.time() + 50, time.time() + 50))

        rule = SyncRule(
            name="bidi-md5-test",
            source=self.src,
            target=self.dst,
            mode="bidirectional",
            excludes=[],
            use_md5=True,
            conflict_strategy="source",
            max_workers=2,
        )
        engine = SyncEngine(rule=rule)
        actions = engine.plan()

        file_actions = [a for a in actions if a.rel_path == "file.txt"]
        self.assertEqual(len(file_actions), 1)
        self.assertEqual(file_actions[0].action_type, ActionType.SKIP)
        self.assertIn("MD5 match", file_actions[0].reason)

    def test_bidirectional_md5_different_newer_wins(self):
        with open(os.path.join(self.src, "file.txt"), "w") as f:
            f.write("source version")
        with open(os.path.join(self.dst, "file.txt"), "w") as f:
            f.write("target version")
        time.sleep(0.05)
        os.utime(os.path.join(self.src, "file.txt"), (time.time() + 100, time.time() + 100))

        rule = SyncRule(
            name="bidi-md5-diff-test",
            source=self.src,
            target=self.dst,
            mode="bidirectional",
            excludes=[],
            use_md5=True,
            conflict_strategy="source",
            max_workers=2,
        )
        engine = SyncEngine(rule=rule)
        actions = engine.plan()

        file_actions = [a for a in actions if a.rel_path == "file.txt"]
        self.assertEqual(len(file_actions), 1)
        self.assertEqual(file_actions[0].action_type, ActionType.OVERWRITE)
        self.assertEqual(file_actions[0].reason, "source is newer")


class TestConflictResolution(unittest.TestCase):
    def setUp(self):
        self.src = tempfile.mkdtemp(prefix="fsync_conflict_src_")
        self.dst = tempfile.mkdtemp(prefix="fsync_conflict_dst_")
        self.state_dir = tempfile.mkdtemp(prefix="fsync_conflict_state_")

    def tearDown(self):
        shutil.rmtree(self.src, ignore_errors=True)
        shutil.rmtree(self.dst, ignore_errors=True)
        shutil.rmtree(self.state_dir, ignore_errors=True)

    def _setup_conflict(self):
        with open(os.path.join(self.src, "both.txt"), "w") as f:
            f.write("source content")
        with open(os.path.join(self.dst, "both.txt"), "w") as f:
            f.write("target content")
        time.sleep(0.05)
        now = time.time()
        os.utime(os.path.join(self.src, "both.txt"), (now + 100, now + 100))
        os.utime(os.path.join(self.dst, "both.txt"), (now + 200, now + 200))
        save_last_sync_time(self.state_dir, "conflict-test", now - 10)

    def _make_engine(self, conflict_strategy, conflict_resolver=None):
        rule = SyncRule(
            name="conflict-test",
            source=self.src,
            target=self.dst,
            mode="bidirectional",
            excludes=[],
            use_md5=True,
            conflict_strategy=conflict_strategy,
            incremental=True,
            max_workers=2,
        )
        return SyncEngine(rule=rule, state_dir=self.state_dir, conflict_resolver=conflict_resolver)

    def test_conflict_keep_source(self):
        self._setup_conflict()
        engine = self._make_engine("source")
        actions = engine.plan()

        conflict_actions = [a for a in actions if a.rel_path == "both.txt"]
        self.assertEqual(len(conflict_actions), 1)
        self.assertEqual(conflict_actions[0].action_type, ActionType.OVERWRITE)
        self.assertIn("keep source", conflict_actions[0].reason)

    def test_conflict_keep_target(self):
        self._setup_conflict()
        engine = self._make_engine("target")
        actions = engine.plan()

        conflict_actions = [a for a in actions if a.rel_path == "both.txt"]
        self.assertEqual(len(conflict_actions), 1)
        self.assertEqual(conflict_actions[0].action_type, ActionType.OVERWRITE)
        self.assertIn("keep target", conflict_actions[0].reason)

    def test_conflict_rename_both(self):
        self._setup_conflict()
        engine = self._make_engine("rename")
        actions = engine.plan()

        conflict_actions = [a for a in actions if a.rel_path == "both.txt"]
        self.assertEqual(len(conflict_actions), 1)
        self.assertEqual(conflict_actions[0].action_type, ActionType.RENAME_AND_COPY)
        self.assertIn("rename both", conflict_actions[0].reason)

    def test_conflict_ask_prompts_user(self):
        self._setup_conflict()
        choices = iter(["s"])
        resolver = lambda path: {"s": "source", "t": "target", "r": "rename"}[next(choices)]
        engine = self._make_engine("ask", conflict_resolver=resolver)
        actions = engine.plan()

        conflict_actions = [a for a in actions if a.rel_path == "both.txt"]
        self.assertEqual(len(conflict_actions), 1)
        self.assertEqual(conflict_actions[0].action_type, ActionType.OVERWRITE)
        self.assertIn("keep source", conflict_actions[0].reason)

    def test_conflict_ask_choose_target(self):
        self._setup_conflict()
        choices = iter(["t"])
        resolver = lambda path: {"s": "source", "t": "target", "r": "rename"}[next(choices)]
        engine = self._make_engine("ask", conflict_resolver=resolver)
        actions = engine.plan()

        conflict_actions = [a for a in actions if a.rel_path == "both.txt"]
        self.assertEqual(len(conflict_actions), 1)
        self.assertIn("keep target", conflict_actions[0].reason)

    def test_conflict_rename_execute(self):
        self._setup_conflict()
        engine = self._make_engine("rename")
        actions = engine.plan()
        result = engine.sync(actions)

        self.assertIn("both.txt", result.renamed)
        self.assertTrue(os.path.exists(os.path.join(self.dst, "both_conflict.txt")))
        with open(os.path.join(self.dst, "both.txt"), "r") as f:
            self.assertEqual(f.read(), "source content")
        with open(os.path.join(self.dst, "both_conflict.txt"), "r") as f:
            self.assertEqual(f.read(), "target content")

    def test_no_conflict_without_incremental_state(self):
        with open(os.path.join(self.src, "both.txt"), "w") as f:
            f.write("source content")
        with open(os.path.join(self.dst, "both.txt"), "w") as f:
            f.write("target content")
        time.sleep(0.05)
        now = time.time()
        os.utime(os.path.join(self.src, "both.txt"), (now + 100, now + 100))
        os.utime(os.path.join(self.dst, "both.txt"), (now + 200, now + 200))

        rule = SyncRule(
            name="no-state-test",
            source=self.src,
            target=self.dst,
            mode="bidirectional",
            excludes=[],
            use_md5=True,
            conflict_strategy="source",
            incremental=False,
            max_workers=2,
        )
        engine = SyncEngine(rule=rule)
        actions = engine.plan()

        file_actions = [a for a in actions if a.rel_path == "both.txt"]
        self.assertEqual(len(file_actions), 1)
        self.assertEqual(file_actions[0].action_type, ActionType.OVERWRITE)
        self.assertEqual(file_actions[0].reason, "target is newer")


class TestIncrementalSync(unittest.TestCase):
    def setUp(self):
        self.src = tempfile.mkdtemp(prefix="fsync_incr_src_")
        self.dst = tempfile.mkdtemp(prefix="fsync_incr_dst_")
        self.state_dir = tempfile.mkdtemp(prefix="fsync_incr_state_")

    def tearDown(self):
        shutil.rmtree(self.src, ignore_errors=True)
        shutil.rmtree(self.dst, ignore_errors=True)
        shutil.rmtree(self.state_dir, ignore_errors=True)

    def test_incremental_skips_old_files(self):
        old_time = time.time() - 3600
        with open(os.path.join(self.src, "old.txt"), "w") as f:
            f.write("old content")
        os.utime(os.path.join(self.src, "old.txt"), (old_time, old_time))

        with open(os.path.join(self.src, "new.txt"), "w") as f:
            f.write("new content")

        save_last_sync_time(self.state_dir, "incr-test", time.time() - 1800)

        rule = SyncRule(
            name="incr-test",
            source=self.src,
            target=self.dst,
            mode="unidirectional",
            excludes=[],
            use_md5=True,
            incremental=True,
            max_workers=2,
        )
        engine = SyncEngine(rule=rule, state_dir=self.state_dir)
        actions = engine.plan()

        new_actions = [a for a in actions if a.rel_path == "new.txt"]
        old_actions = [a for a in actions if a.rel_path == "old.txt"]
        self.assertEqual(len(new_actions), 1)
        self.assertEqual(new_actions[0].action_type, ActionType.COPY)
        self.assertEqual(len(old_actions), 0)

    def test_incremental_syncs_new_file(self):
        save_last_sync_time(self.state_dir, "incr-new-test", time.time() - 10)

        time.sleep(0.05)
        with open(os.path.join(self.src, "recent.txt"), "w") as f:
            f.write("recent content")

        rule = SyncRule(
            name="incr-new-test",
            source=self.src,
            target=self.dst,
            mode="unidirectional",
            excludes=[],
            use_md5=True,
            incremental=True,
            max_workers=2,
        )
        engine = SyncEngine(rule=rule, state_dir=self.state_dir)
        actions = engine.plan()

        recent_actions = [a for a in actions if a.rel_path == "recent.txt"]
        self.assertEqual(len(recent_actions), 1)
        self.assertEqual(recent_actions[0].action_type, ActionType.COPY)

    def test_incremental_saves_sync_time(self):
        with open(os.path.join(self.src, "file.txt"), "w") as f:
            f.write("content")

        rule = SyncRule(
            name="incr-save-test",
            source=self.src,
            target=self.dst,
            mode="unidirectional",
            excludes=[],
            use_md5=True,
            incremental=True,
            max_workers=2,
        )
        engine = SyncEngine(rule=rule, state_dir=self.state_dir)
        actions = engine.plan()
        before_sync = time.time()
        engine.sync(actions)

        saved_time = load_last_sync_time(self.state_dir, "incr-save-test")
        self.assertIsNotNone(saved_time)
        self.assertGreaterEqual(saved_time, before_sync)

    def test_incremental_second_run_skips_synced(self):
        with open(os.path.join(self.src, "file.txt"), "w") as f:
            f.write("content")

        rule = SyncRule(
            name="incr-second-test",
            source=self.src,
            target=self.dst,
            mode="unidirectional",
            excludes=[],
            use_md5=True,
            incremental=True,
            max_workers=2,
        )
        engine = SyncEngine(rule=rule, state_dir=self.state_dir)
        actions1 = engine.plan()
        engine.sync(actions1)

        engine2 = SyncEngine(rule=rule, state_dir=self.state_dir)
        actions2 = engine2.plan()

        self.assertEqual(len(actions2), 0)

    def test_incremental_no_state_syncs_all(self):
        with open(os.path.join(self.src, "a.txt"), "w") as f:
            f.write("a")
        with open(os.path.join(self.src, "b.txt"), "w") as f:
            f.write("b")

        rule = SyncRule(
            name="incr-nostate-test",
            source=self.src,
            target=self.dst,
            mode="unidirectional",
            excludes=[],
            use_md5=True,
            incremental=True,
            max_workers=2,
        )
        engine = SyncEngine(rule=rule, state_dir=self.state_dir)
        actions = engine.plan()

        self.assertEqual(len(actions), 2)


class TestConfigFile(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp(prefix="fsync_config_")
        self.src1 = tempfile.mkdtemp(prefix="fsync_cfg_src1_")
        self.src2 = tempfile.mkdtemp(prefix="fsync_cfg_src2_")
        self.dst1 = tempfile.mkdtemp(prefix="fsync_cfg_dst1_")
        self.dst2 = tempfile.mkdtemp(prefix="fsync_cfg_dst2_")

    def tearDown(self):
        for d in [self.tmpdir, self.src1, self.src2, self.dst1, self.dst2]:
            shutil.rmtree(d, ignore_errors=True)

    def test_load_config_multiple_rules(self):
        config_path = os.path.join(self.tmpdir, "test_config.yaml")
        with open(config_path, "w") as f:
            f.write(f"""
rules:
  - name: "rule-one"
    source: "{self.src1}"
    target: "{self.dst1}"
    mode: "unidirectional"
    excludes: ["*.tmp"]
    use_md5: true
    conflict_strategy: "source"
  - name: "rule-two"
    source: "{self.src2}"
    target: "{self.dst2}"
    mode: "bidirectional"
    excludes: ["*.log"]
    use_md5: false
    conflict_strategy: "target"
    incremental: true
    max_workers: 2
""")
        config = load_config(config_path)
        self.assertEqual(len(config.rules), 2)
        self.assertEqual(config.rules[0].name, "rule-one")
        self.assertEqual(config.rules[0].source, self.src1)
        self.assertEqual(config.rules[0].mode, "unidirectional")
        self.assertTrue(config.rules[0].use_md5)
        self.assertEqual(config.rules[1].name, "rule-two")
        self.assertEqual(config.rules[1].mode, "bidirectional")
        self.assertFalse(config.rules[1].use_md5)
        self.assertTrue(config.rules[1].incremental)
        self.assertEqual(config.rules[1].max_workers, 2)

    def test_config_not_found(self):
        with self.assertRaises(FileNotFoundError):
            load_config("/nonexistent/path/config.yaml")

    def test_config_multiple_rules_execute(self):
        with open(os.path.join(self.src1, "a.txt"), "w") as f:
            f.write("from rule one")
        with open(os.path.join(self.src2, "b.txt"), "w") as f:
            f.write("from rule two")

        config_path = os.path.join(self.tmpdir, "multi_config.yaml")
        with open(config_path, "w") as f:
            f.write(f"""
rules:
  - name: "sync-one"
    source: "{self.src1}"
    target: "{self.dst1}"
    mode: "unidirectional"
    excludes: []
    use_md5: true
  - name: "sync-two"
    source: "{self.src2}"
    target: "{self.dst2}"
    mode: "unidirectional"
    excludes: []
    use_md5: true
""")
        config = load_config(config_path)

        for rule in config.rules:
            engine = SyncEngine(rule=rule)
            actions = engine.plan()
            engine.sync(actions)

        self.assertTrue(os.path.exists(os.path.join(self.dst1, "a.txt")))
        self.assertTrue(os.path.exists(os.path.join(self.dst2, "b.txt")))
        with open(os.path.join(self.dst1, "a.txt"), "r") as f:
            self.assertEqual(f.read(), "from rule one")
        with open(os.path.join(self.dst2, "b.txt"), "r") as f:
            self.assertEqual(f.read(), "from rule two")

    def test_config_default_values(self):
        config_path = os.path.join(self.tmpdir, "minimal_config.yaml")
        with open(config_path, "w") as f:
            f.write("""
rules:
  - name: "minimal"
    source: "/tmp/src"
    target: "/tmp/dst"
""")
        config = load_config(config_path)
        rule = config.rules[0]
        self.assertEqual(rule.mode, "unidirectional")
        self.assertEqual(rule.excludes, list(DEFAULT_EXCLUDES))
        self.assertTrue(rule.use_md5)
        self.assertEqual(rule.conflict_strategy, "ask")
        self.assertFalse(rule.incremental)
        self.assertEqual(rule.max_workers, 4)

    def test_state_persistence(self):
        state_dir = self.tmpdir
        rule_name = "state-test"

        self.assertIsNone(load_last_sync_time(state_dir, rule_name))

        t = time.time()
        save_last_sync_time(state_dir, rule_name, t)

        loaded = load_last_sync_time(state_dir, rule_name)
        self.assertAlmostEqual(loaded, t, places=2)

        state_file = os.path.join(state_dir, f".foldersync_{rule_name}.json")
        self.assertTrue(os.path.exists(state_file))
        with open(state_file, "r") as f:
            data = json.load(f)
        self.assertAlmostEqual(data["last_sync_time"], t, places=2)


class TestSchedulerInterval(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp(prefix="fsync_sched_")
        self.src = tempfile.mkdtemp(prefix="fsync_sched_src_")
        self.dst = tempfile.mkdtemp(prefix="fsync_sched_dst_")

    def tearDown(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)
        shutil.rmtree(self.src, ignore_errors=True)
        shutil.rmtree(self.dst, ignore_errors=True)

    def test_scheduler_runs_multiple_times(self):
        counter = {"value": 0}

        def increment():
            counter["value"] += 1

        scheduler = Scheduler(sync_func=increment, interval=1)

        def run_scheduler():
            for _ in range(3):
                scheduler.sync_func()
                time.sleep(0.1)

        thread = threading.Thread(target=run_scheduler)
        thread.start()
        thread.join(timeout=5)

        self.assertGreaterEqual(counter["value"], 2)

    def test_scheduler_zero_interval_error(self):
        scheduler = Scheduler(sync_func=lambda: None, interval=0)
        import io
        import sys
        captured = io.StringIO()
        sys.stdout = captured
        scheduler.run_loop()
        sys.stdout = sys.__stdout__
        self.assertIn("interval must be > 0", captured.getvalue())

    def test_scheduler_sync_with_real_dirs(self):
        with open(os.path.join(self.src, "sched.txt"), "w") as f:
            f.write("scheduled content")

        rule = SyncRule(
            name="sched-test",
            source=self.src,
            target=self.dst,
            mode="unidirectional",
            excludes=[],
            use_md5=True,
            max_workers=2,
        )

        call_count = {"value": 0}

        def do_sync():
            call_count["value"] += 1
            engine = SyncEngine(rule=rule)
            actions = engine.plan()
            engine.sync(actions)

        for _ in range(3):
            do_sync()

        self.assertTrue(os.path.exists(os.path.join(self.dst, "sched.txt")))
        self.assertGreaterEqual(call_count["value"], 3)

    def test_scheduler_idempotent_repeated_sync(self):
        with open(os.path.join(self.src, "idem.txt"), "w") as f:
            f.write("idempotent")

        rule = SyncRule(
            name="idem-test",
            source=self.src,
            target=self.dst,
            mode="unidirectional",
            excludes=[],
            use_md5=True,
            max_workers=2,
        )

        engine1 = SyncEngine(rule=rule)
        actions1 = engine1.plan()
        engine1.sync(actions1)

        engine2 = SyncEngine(rule=rule)
        actions2 = engine2.plan()

        skip_actions = [a for a in actions2 if a.action_type == ActionType.SKIP]
        non_skip_actions = [a for a in actions2 if a.action_type != ActionType.SKIP]
        self.assertEqual(len(non_skip_actions), 0)

        with open(os.path.join(self.dst, "idem.txt"), "r") as f:
            self.assertEqual(f.read(), "idempotent")


class TestReportGeneration(unittest.TestCase):
    def setUp(self):
        self.src = tempfile.mkdtemp(prefix="fsync_report_src_")
        self.dst = tempfile.mkdtemp(prefix="fsync_report_dst_")
        self.report_dir = tempfile.mkdtemp(prefix="fsync_reports_")

    def tearDown(self):
        shutil.rmtree(self.src, ignore_errors=True)
        shutil.rmtree(self.dst, ignore_errors=True)
        shutil.rmtree(self.report_dir, ignore_errors=True)

    def test_report_saves_to_file(self):
        with open(os.path.join(self.src, "r.txt"), "w") as f:
            f.write("report test")

        rule = SyncRule(
            name="report-test",
            source=self.src,
            target=self.dst,
            mode="unidirectional",
            excludes=[],
            use_md5=True,
            max_workers=2,
        )
        engine = SyncEngine(rule=rule)
        actions = engine.plan()
        result = engine.sync(actions)

        report = SyncReport("report-test", result, actions)
        report_path = report.save(self.report_dir)

        self.assertTrue(os.path.exists(report_path))
        with open(report_path, "r") as f:
            content = f.read()
        self.assertIn("Copied:", content)
        self.assertIn("r.txt", content)

    def test_preview_no_execution(self):
        with open(os.path.join(self.src, "p.txt"), "w") as f:
            f.write("preview test")

        rule = SyncRule(
            name="preview-test",
            source=self.src,
            target=self.dst,
            mode="unidirectional",
            excludes=[],
            use_md5=True,
            max_workers=2,
        )
        engine = SyncEngine(rule=rule)
        actions = engine.plan()

        preview = preview_actions(actions)
        self.assertIn("Will Copy", preview)
        self.assertIn("p.txt", preview)

        self.assertFalse(os.path.exists(os.path.join(self.dst, "p.txt")))

    def test_report_includes_errors(self):
        rule = SyncRule(
            name="error-test",
            source=self.src,
            target=self.dst,
            mode="unidirectional",
            excludes=[],
            use_md5=True,
            max_workers=2,
        )
        from foldersync.sync_engine import SyncResult
        result = SyncResult()
        result.errors.append(("bad.txt", "Permission denied"))

        report = SyncReport("error-test", result, [])
        text = report.to_text()
        self.assertIn("Errors:", text)
        self.assertIn("bad.txt", text)
        self.assertIn("Permission denied", text)


if __name__ == "__main__":
    unittest.main(verbosity=2)
