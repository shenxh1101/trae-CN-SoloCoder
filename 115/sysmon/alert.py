class AlertMonitor:
    def __init__(self, cpu_threshold=90.0, mem_threshold=90.0, consecutive_count=3, command=None):
        self.cpu_threshold = cpu_threshold
        self.mem_threshold = mem_threshold
        self.consecutive_count = consecutive_count
        self.command = command
        self._cpu_consecutive = 0
        self._mem_consecutive = 0
        self._triggered = False
        self._alert_type = ""

    def check(self, cpu_percent, mem_percent):
        if cpu_percent > self.cpu_threshold:
            self._cpu_consecutive += 1
        else:
            self._cpu_consecutive = 0

        if mem_percent > self.mem_threshold:
            self._mem_consecutive += 1
        else:
            self._mem_consecutive = 0

        self._triggered = False
        self._alert_type = ""

        if self._cpu_consecutive >= self.consecutive_count:
            self._triggered = True
            self._alert_type = "cpu"

        if self._mem_consecutive >= self.consecutive_count:
            self._triggered = True
            self._alert_type = "memory" if not self._triggered else "cpu+memory"

        return self._triggered

    def is_triggered(self):
        return self._triggered

    def get_alert_message(self):
        if self._alert_type == "cpu":
            return f"CPU 占用率连续 {self.consecutive_count} 次超过 {self.cpu_threshold}%！"
        elif self._alert_type == "memory":
            return f"内存占用率连续 {self.consecutive_count} 次超过 {self.mem_threshold}%！"
        elif self._alert_type == "cpu+memory":
            return f"CPU 和内存占用率连续 {self.consecutive_count} 次超过阈值！"
        return ""

    def reset(self):
        self._cpu_consecutive = 0
        self._mem_consecutive = 0
        self._triggered = False
        self._alert_type = ""
