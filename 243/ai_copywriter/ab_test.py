import random
import hashlib
import math
from typing import Tuple


class ABTester:
    PLATFORM_BASE_CTR = {
        "小红书": 0.035,
        "淘宝": 0.025,
        "朋友圈": 0.045,
        "抖音": 0.055,
    }

    TONE_CTR_MODIFIER = {
        "亲切": 1.1,
        "专业": 1.0,
        "幽默": 1.15,
        "紧迫": 1.2,
    }

    Z_TABLE = {
        0.90: 1.645,
        0.95: 1.96,
        0.99: 2.576,
    }

    def simulate(
        self,
        copy_a: dict,
        copy_b: dict,
        impressions: int = None,
        confidence_level: float = 0.95,
    ) -> dict:
        if impressions is None:
            impressions = random.randint(8000, 12000)

        ctr_a = self._estimate_ctr(copy_a)
        ctr_b = self._estimate_ctr(copy_b)

        noise_a = random.uniform(0.85, 1.15)
        noise_b = random.uniform(0.85, 1.15)
        clicks_a = int(impressions * ctr_a * noise_a)
        clicks_b = int(impressions * ctr_b * noise_b)

        return self._build_ab_test_result(
            copy_a, copy_b,
            impressions, impressions,
            clicks_a, clicks_b,
            ctr_a, ctr_b,
            confidence_level,
            data_source="simulated",
        )

    def analyze_real_data(
        self,
        copy_a: dict,
        copy_b: dict,
        impressions_a: int,
        impressions_b: int,
        clicks_a: int,
        clicks_b: int,
        confidence_level: float = 0.95,
    ) -> dict:
        if impressions_a <= 0 or impressions_b <= 0:
            raise ValueError("曝光量必须大于 0")
        if clicks_a < 0 or clicks_b < 0:
            raise ValueError("点击量不能为负数")
        if clicks_a > impressions_a or clicks_b > impressions_b:
            raise ValueError("点击量不能大于曝光量")

        ctr_a_obs = clicks_a / impressions_a
        ctr_b_obs = clicks_b / impressions_b

        return self._build_ab_test_result(
            copy_a, copy_b,
            impressions_a, impressions_b,
            clicks_a, clicks_b,
            ctr_a_obs, ctr_b_obs,
            confidence_level,
            data_source="real",
        )

    def _build_ab_test_result(
        self,
        copy_a: dict,
        copy_b: dict,
        impressions_a: int,
        impressions_b: int,
        clicks_a: int,
        clicks_b: int,
        ctr_a: float,
        ctr_b: float,
        confidence_level: float,
        data_source: str = "real",
    ) -> dict:
        ctr_a_obs = clicks_a / impressions_a
        ctr_b_obs = clicks_b / impressions_b

        ci_a = self._wilson_confidence_interval(clicks_a, impressions_a, confidence_level)
        ci_b = self._wilson_confidence_interval(clicks_b, impressions_b, confidence_level)

        p_value = self._two_proportion_z_test(clicks_a, clicks_b, impressions_a, impressions_b)
        is_significant = p_value < (1 - confidence_level)
        effect_size = self._cohen_h(ctr_a_obs, ctr_b_obs)

        if is_significant:
            if p_value < 0.001:
                significance_level = "高 (p < 0.001)"
            elif p_value < 0.01:
                significance_level = "高 (p < 0.01)"
            elif p_value < 0.05:
                significance_level = "中 (p < 0.05)"
            else:
                significance_level = "低 (不显著)"
        else:
            significance_level = "低 (不显著)"

        if ctr_a_obs > ctr_b_obs:
            winner = "A"
            uplift = (ctr_a_obs - ctr_b_obs) / ctr_b_obs * 100 if ctr_b_obs > 0 else 0
        elif ctr_b_obs > ctr_a_obs:
            winner = "B"
            uplift = (ctr_b_obs - ctr_a_obs) / ctr_a_obs * 100 if ctr_a_obs > 0 else 0
        else:
            winner = "平局"
            uplift = 0

        avg_impressions = (impressions_a + impressions_b) / 2
        power = self._calculate_power(ctr_a_obs, ctr_b_obs, int(avg_impressions), confidence_level)
        nnt = self._calculate_nnt(ctr_a_obs, ctr_b_obs)

        return {
            "data_source": data_source,
            "copy_a": self._build_copy_stats(copy_a, "A", impressions_a, clicks_a, ctr_a_obs, ci_a, ctr_a),
            "copy_b": self._build_copy_stats(copy_b, "B", impressions_b, clicks_b, ctr_b_obs, ci_b, ctr_b),
            "winner": winner,
            "relative_uplift_pct": round(uplift, 2),
            "absolute_diff_pct": round(abs(ctr_a_obs - ctr_b_obs) * 100, 3),
            "confidence_level": f"{int(confidence_level * 100)}%",
            "p_value": round(p_value, 4),
            "is_statistically_significant": is_significant,
            "significance_level": significance_level,
            "effect_size_cohen_h": round(effect_size, 3),
            "effect_size_interpretation": self._interpret_cohen_h(effect_size),
            "statistical_power": round(power * 100, 1),
            "power_interpretation": self._interpret_power(power),
            "nnt": nnt,
            "nnt_interpretation": self._interpret_nnt(nnt),
            "sample_size_result": self._interpret_sample_size(int(avg_impressions), ctr_a_obs, ctr_b_obs, confidence_level, power),
            "recommendation": self._generate_recommendation(winner, is_significant, power, uplift),
        }

    def estimate_single_ctr(self, copy_result: dict, impressions: int = 10000) -> dict:
        ctr = self._estimate_ctr(copy_result)
        clicks = int(impressions * ctr * random.uniform(0.95, 1.05))
        observed_ctr = clicks / impressions
        ci_95 = self._wilson_confidence_interval(clicks, impressions, 0.95)
        ci_99 = self._wilson_confidence_interval(clicks, impressions, 0.99)
        se = self._standard_error(observed_ctr, impressions)

        return {
            "platform": copy_result["platform"],
            "tone": copy_result["tone"],
            "estimated_ctr": f"{round(ctr * 100, 2)}%",
            "observed_ctr": f"{round(observed_ctr * 100, 2)}%",
            "confidence_interval_95": f"[{round(ci_95[0] * 100, 2)}%, {round(ci_95[1] * 100, 2)}%]",
            "confidence_interval_99": f"[{round(ci_99[0] * 100, 2)}%, {round(ci_99[1] * 100, 2)}%]",
            "standard_error": f"±{round(se * 100, 3)}%",
            "margin_of_error_95": f"±{round(se * self.Z_TABLE[0.95] * 100, 2)}%",
            "ctr_level": self._ctr_level(ctr),
        }

    def _build_copy_stats(self, copy, label, impressions, clicks, observed_ctr, ci, estimated_ctr):
        se = self._standard_error(observed_ctr, impressions)
        return {
            "label": label,
            "platform": copy["platform"],
            "tone": copy["tone"],
            "preview": copy["copy"][:80] + "...",
            "estimated_ctr_pct": round(estimated_ctr * 100, 2),
            "impressions": impressions,
            "clicks": clicks,
            "observed_ctr_pct": round(observed_ctr * 100, 3),
            "confidence_interval_low_pct": round(ci[0] * 100, 3),
            "confidence_interval_high_pct": round(ci[1] * 100, 3),
            "confidence_interval_str": f"[{round(ci[0] * 100, 2)}%, {round(ci[1] * 100, 2)}%]",
            "standard_error_pct": round(se * 100, 3),
            "conversion_range_95": f"{round(observed_ctr * 100, 2)}% ±{round(se * self.Z_TABLE[0.95] * 100, 2)}%",
        }

    def _estimate_ctr(self, copy_result: dict) -> float:
        base_ctr = self.PLATFORM_BASE_CTR.get(copy_result["platform"], 0.03)
        tone_mod = self.TONE_CTR_MODIFIER.get(copy_result["tone"], 1.0)

        content_hash = int(hashlib.md5(copy_result["copy"].encode()).hexdigest()[:8], 16)
        content_factor = 0.9 + (content_hash % 20) / 100

        length = len(copy_result["copy"])
        if 50 <= length <= 200:
            length_factor = 1.05
        elif length < 50:
            length_factor = 0.95
        else:
            length_factor = 1.0

        point_count = len(copy_result.get("selling_points", []))
        point_factor = min(1.0 + point_count * 0.03, 1.15)

        ctr = base_ctr * tone_mod * content_factor * length_factor * point_factor
        return min(ctr, 0.15)

    def _standard_error(self, p: float, n: int) -> float:
        if p <= 0 or p >= 1 or n <= 0:
            return 0.0
        return math.sqrt(p * (1 - p) / n)

    def _wilson_confidence_interval(
        self,
        successes: int,
        n: int,
        confidence_level: float = 0.95,
    ) -> Tuple[float, float]:
        z = self.Z_TABLE.get(confidence_level, 1.96)
        if n == 0:
            return (0.0, 1.0)

        p_hat = successes / n
        denominator = 1 + z**2 / n
        center = (p_hat + z**2 / (2 * n)) / denominator
        margin = (z * math.sqrt((p_hat * (1 - p_hat) + z**2 / (4 * n)) / n)) / denominator

        return (max(0.0, center - margin), min(1.0, center + margin))

    def _two_proportion_z_test(
        self,
        successes_a: int,
        successes_b: int,
        n_a: int,
        n_b: int,
    ) -> float:
        if n_a == 0 or n_b == 0:
            return 1.0

        p1 = successes_a / n_a
        p2 = successes_b / n_b
        p_pooled = (successes_a + successes_b) / (n_a + n_b)

        if p_pooled == 0 or p_pooled == 1:
            return 1.0

        se = math.sqrt(p_pooled * (1 - p_pooled) * (1 / n_a + 1 / n_b))
        if se == 0:
            return 1.0

        z = (p1 - p2) / se
        p_value = 2 * (1 - self._normal_cdf(abs(z)))

        return max(min(p_value, 1.0), 0.0)

    def _normal_cdf(self, x: float) -> float:
        return 0.5 * (1 + math.erf(x / math.sqrt(2)))

    def _cohen_h(self, p1: float, p2: float) -> float:
        if p1 <= 0 or p1 >= 1 or p2 <= 0 or p2 >= 1:
            return 0.0
        phi1 = 2 * math.asin(math.sqrt(p1))
        phi2 = 2 * math.asin(math.sqrt(p2))
        return abs(phi1 - phi2)

    def _interpret_cohen_h(self, h: float) -> str:
        if h < 0.2:
            return "极小效应 (h < 0.2)"
        elif h < 0.5:
            return "小效应 (0.2 ≤ h < 0.5)"
        elif h < 0.8:
            return "中等效应 (0.5 ≤ h < 0.8)"
        else:
            return "大效应 (h ≥ 0.8)"

    def _calculate_power(
        self,
        p1: float,
        p2: float,
        n: int,
        confidence_level: float = 0.95,
    ) -> float:
        alpha = 1 - confidence_level
        z_alpha = self.Z_TABLE.get(confidence_level, 1.96)
        h = self._cohen_h(p1, p2)
        z_beta = h * math.sqrt(n / 2) - z_alpha
        power = self._normal_cdf(z_beta)
        return power

    def _interpret_power(self, power: float) -> str:
        if power >= 0.8:
            return "高 (≥80%) - 检测真实差异的能力强"
        elif power >= 0.5:
            return "中 (50-80%) - 检测真实差异的能力中等"
        else:
            return "低 (<50%) - 检测真实差异的能力弱，建议增加样本量"

    def _calculate_nnt(self, p1: float, p2: float) -> float:
        diff = abs(p1 - p2)
        if diff == 0:
            return float("inf")
        return round(1 / diff, 1)

    def _interpret_nnt(self, nnt: float) -> str:
        if nnt == float("inf"):
            return "两组无差异"
        elif nnt <= 10:
            return f"很好 - 每 {nnt} 次曝光就能多获得1次点击"
        elif nnt <= 50:
            return f"一般 - 每 {nnt} 次曝光才能多获得1次点击"
        else:
            return f"较差 - 需要 {nnt} 次曝光才能多获得1次点击"

    def _interpret_sample_size(self, n, p1, p2, confidence_level, power):
        h = self._cohen_h(p1, p2)
        if h == 0:
            return "两组CTR完全相同，无法评估样本量需求"

        z_alpha = self.Z_TABLE.get(confidence_level, 1.96)
        z_beta_80 = 0.84
        required_n = int(2 * ((z_alpha + z_beta_80) / h) ** 2) + 1

        return {
            "current_sample_size": n,
            "required_sample_size_80_power": required_n,
            "adequacy": "充足 ✓" if n >= required_n else "不足 ✗",
            "gap": max(0, required_n - n),
        }

    def _generate_recommendation(self, winner, is_significant, power, uplift):
        if not is_significant:
            if power < 0.8:
                return "建议继续增加样本量，当前样本量不足以检测出真实差异（检验效能不足）"
            else:
                return "两组文案无统计学差异，可以考虑其他维度优化"
        else:
            if uplift >= 10:
                return f"强烈推荐选择文案{winner}，相对提升{uplift:.1f}%，效果显著"
            elif uplift >= 5:
                return f"推荐选择文案{winner}，相对提升{uplift:.1f}%，效果较好"
            else:
                return f"文案{winner}表现更好，但提升幅度较小（{uplift:.1f}%），可考虑继续优化"

    def _ctr_level(self, ctr: float) -> str:
        if ctr >= 0.06:
            return "优秀 🔥"
        elif ctr >= 0.04:
            return "良好 👍"
        elif ctr >= 0.025:
            return "中等 📊"
        else:
            return "待优化 ⚠️"
