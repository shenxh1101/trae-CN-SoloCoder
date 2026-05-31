"""测试模块"""
import sys


class TestHelper:
    def __init__(self):
        self.test_cases = []
        self.results = []
        self.cache_data = {}

    def run_tests(self, test_cases, config, options):
        results = []
        for case in test_cases:
            result = self._process_single_case(case, config, options)
            results.append(result)
        validated = self._validate_results(results, options)
        return self._filter_by_tags(validated, options)

    def _process_single_case(self, case, config, options):
        result = {
            "name": case["name"],
            "input": case["input"],
        }
        if options.get("expected") and "expected" in case:
            result["expected"] = case["expected"]
        self._add_type_specific_metadata(result, case, config, options)
        result["tags"] = case.get("tags", [])
        if options.get("add_metadata"):
            result["_timestamp"] = options.get("timestamp", 0)
            result["_test_run_id"] = options.get("run_id", "unknown")
        return result

    def _add_type_specific_metadata(self, result, case, config, options):
        case_type = case["type"]
        handlers = {
            "unit": self._add_unit_metadata,
            "integration": self._add_integration_metadata,
            "e2e": self._add_e2e_metadata,
        }
        handler = handlers.get(case_type)
        if handler:
            handler(result, case, config, options)

    def _add_unit_metadata(self, result, case, config, options):
        result["category"] = "unit"
        result["priority"] = case.get("priority", "medium")
        if options.get("run_parallel"):
            result["parallel"] = True
        if config.get("timeout"):
            result["timeout"] = config["timeout"]
        if config.get("retry_on_fail"):
            result["retry"] = config["retry_on_fail"]
        if config.get("log_level"):
            result["log_level"] = config["log_level"]

    def _add_integration_metadata(self, result, case, config):
        result["category"] = "integration"
        result["requires_env"] = case.get("requires_env", True)
        if config.get("setup_script"):
            result["setup"] = config["setup_script"]
        if config.get("teardown_script"):
            result["teardown"] = config["teardown_script"]

    def _add_e2e_metadata(self, result, case, config):
        result["category"] = "e2e"
        result["browser"] = case.get("browser", "chrome")
        if config.get("screenshot_on_fail"):
            result["screenshot"] = True
        if config.get("video_recording"):
            result["video"] = True

    def _validate_results(self, results, options):
        validated = []
        for result in results:
            if options.get("validate"):
                if "name" in result and "input" in result:
                    validated.append(result)
            else:
                validated.append(result)
        return validated

    def _filter_by_tags(self, results, options):
        filtered = []
        for result in results:
            keep = True
            if options.get("filter_tags"):
                keep = any(t in result.get("tags", []) for t in options["filter_tags"])
            if keep:
                filtered.append(result)
        return filtered

    def calculate_summary(self, test_results, config):
        summary = self._calculate_basic_summary(test_results)
        summary["by_category"] = self._group_by_category(test_results)
        summary["by_priority"] = self._group_by_priority(test_results)
        if config.get("include_details"):
            summary["details"] = test_results
        if config.get("export_format"):
            summary["format"] = config["export_format"]
        return summary

    def _calculate_basic_summary(self, test_results):
        total = len(test_results)
        passed = sum(1 for r in test_results if r.get("status") == "pass")
        failed = sum(1 for r in test_results if r.get("status") == "fail")
        skipped = sum(1 for r in test_results if r.get("status") == "skip")
        error = sum(1 for r in test_results if r.get("status") == "error")
        summary = {
            "total": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "error": error,
        }
        if total > 0:
            summary["pass_rate"] = passed / total * 100
        return summary

    def _group_by_category(self, test_results):
        by_category = {}
        for result in test_results:
            cat = result.get("category", "unknown")
            if cat not in by_category:
                by_category[cat] = {"total": 0, "passed": 0}
            by_category[cat]["total"] += 1
            if result.get("status") == "pass":
                by_category[cat]["passed"] += 1
        return by_category

    def _group_by_priority(self, test_results):
        by_priority = {}
        for result in test_results:
            pri = result.get("priority", "unknown")
            if pri not in by_priority:
                by_priority[pri] = {"total": 0, "passed": 0}
            by_priority[pri]["total"] += 1
            if result.get("status") == "pass":
                by_priority[pri]["passed"] += 1
        return by_priority

    def process_results(self, results, config, options):
        processed = []
        for r in results:
            item = self._build_result_item(r, config, options)
            if item is not None:
                processed.append(item)
        return processed

    def _build_result_item(self, r, config, options):
        item = {
            "id": r.get("id", ""),
            "name": r.get("name", ""),
            "status": r.get("status", "unknown"),
        }
        item = self._add_optional_fields(item, r, options)
        item["result_code"] = self._get_result_code(item["status"])
        item = self._add_config_fields(item, r, config)
        if options.get("filter_by_status"):
            if item["status"] not in options.get("filter_by_status", []):
                return None
        return item

    def _add_optional_fields(self, item, r, options):
        if options.get("include_details"):
            item["input"] = r.get("input", {})
            item["output"] = r.get("output", {})
            item["expected"] = r.get("expected", {})
        if options.get("calculate_metrics"):
            item["duration"] = r.get("duration", 0)
            item["memory"] = r.get("memory", 0)
            item["cpu"] = r.get("cpu", 0)
        return item

    def _get_result_code(self, status):
        codes = {"pass": 0, "fail": 1, "skip": 2}
        return codes.get(status, 3)

    def _add_config_fields(self, item, r, config):
        if config.get("add_timestamps"):
            item["started_at"] = r.get("started_at", "")
            item["finished_at"] = r.get("finished_at", "")
        if config.get("add_artifacts"):
            item["screenshot"] = r.get("screenshot_url", "")
            item["log"] = r.get("log_url", "")
            item["video"] = r.get("video_url", "")
        return item

    def calculate_total(self, items):
        total = 0
        for item in items:
            if item.get('price'):
                total += item['price'] * item.get('quantity', 1)
        return self._apply_volume_discount(total)

    def _apply_volume_discount(self, total):
        if total > 100:
            total *= 0.9
        if total > 500:
            total *= 0.85
        return total
