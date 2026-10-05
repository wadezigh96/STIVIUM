import unittest

from task_engine import execute_task


class TaskEngineTests(unittest.TestCase):
    def test_grid(self):
        result = execute_task('grid trading {"price":100,"lower":90,"upper":110,"levels":5}')
        self.assertEqual(result["task_type"], "grid_trading")
        self.assertEqual(result["output"]["grid"], [90.0, 95.0, 100.0, 105.0, 110.0])

    def test_health_factor(self):
        result = execute_task('health factor {"collateral":200,"debt":100,"liquidation_threshold":0.8}')
        self.assertEqual(result["task_type"], "health_factor")
        self.assertEqual(result["output"]["health_factor"], 1.6)

    def test_yield_ranking(self):
        result = execute_task('yield optimisation {"candidates":[{"name":"A","apy":10,"risk":2},{"name":"B","apy":12,"risk":5}]}')
        self.assertEqual(result["task_type"], "yield_optimisation")
        self.assertEqual(result["output"]["ranking"][0]["name"], "A")

    def test_missing_structured_input_is_explicit(self):
        result = execute_task("grid trading")
        self.assertEqual(result["output"]["status"], "needs_input")

    def test_rebalancing(self):
        result = execute_task(
            'rebalancing {"target":{"BTC":50,"ETH":30,"USDT":20},"current":{"BTC":40,"ETH":40,"USDT":20}}'
        )
        self.assertEqual(result["task_type"], "rebalancing")
        self.assertEqual(result["output"]["status"], "ok")
        self.assertEqual(result["output"]["actions"][0]["asset"], "BTC")
        self.assertEqual(result["output"]["actions"][0]["delta_pct"], 10.0)


if __name__ == "__main__":
    unittest.main()
