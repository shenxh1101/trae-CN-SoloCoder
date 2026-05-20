package main

import (
	"fmt"
	"math/rand"
	"sync"
	"sync/atomic"
	"time"
)

type Prize struct {
	ID          uint
	Name        string
	Stock       int
	Probability float64
	IsEnabled   bool
}

func testProbability() {
	fmt.Println("=== 测试1: 抽奖算法验证 ===")

	prizes := []Prize{
		{ID: 1, Name: "iPhone 15", Stock: 1, Probability: 0.01, IsEnabled: true},
		{ID: 2, Name: "AirPods Pro", Stock: 5, Probability: 0.05, IsEnabled: true},
		{ID: 3, Name: "100元优惠券", Stock: 50, Probability: 0.14, IsEnabled: true},
		{ID: 4, Name: "10元优惠券", Stock: 200, Probability: 0.30, IsEnabled: true},
		{ID: 5, Name: "谢谢参与", Stock: 10000, Probability: 0.50, IsEnabled: true},
	}

	totalProb := 0.0
	for _, p := range prizes {
		totalProb += p.Probability
	}
	fmt.Printf("总概率: %.2f%%\n", totalProb*100)
	fmt.Printf("概率是否等于100%%: %v\n\n", totalProb == 1.0)

	results := make(map[string]int)
	totalDraws := 100000

	for i := 0; i < totalDraws; i++ {
		prize := doDrawTest(prizes)
		results[prize.Name]++
	}

	fmt.Println("模拟10万次抽奖结果:")
	for _, p := range prizes {
		count := results[p.Name]
		actualProb := float64(count) / float64(totalDraws)
		fmt.Printf("  %s: %d次 (实际: %.2f%%, 期望: %.2f%%)\n",
			p.Name, count, actualProb*100, p.Probability*100)
	}
	fmt.Println()
}

func doDrawTest(prizes []Prize) Prize {
	available := make([]Prize, 0)
	for _, p := range prizes {
		if p.IsEnabled && p.Stock > 0 {
			available = append(available, p)
		}
	}

	totalProb := 0.0
	for _, p := range available {
		totalProb += p.Probability
	}

	r := rand.Float64() * totalProb
	accum := 0.0

	for _, p := range available {
		accum += p.Probability
		if r <= accum {
			return p
		}
	}

	return available[len(available)-1]
}

func testStockZero() {
	fmt.Println("=== 测试2: 库存为0时不可中验证 ===")

	prizes := []Prize{
		{ID: 1, Name: "一等奖", Stock: 0, Probability: 0.5, IsEnabled: true},
		{ID: 2, Name: "二等奖", Stock: 100, Probability: 0.5, IsEnabled: true},
	}

	hitFirst := 0
	for i := 0; i < 10000; i++ {
		prize := doDrawTest(prizes)
		if prize.ID == 1 {
			hitFirst++
		}
	}

	fmt.Printf("一等奖库存为0，模拟1万次抽奖\n")
	fmt.Printf("一等奖被抽中次数: %d (期望: 0)\n", hitFirst)
	fmt.Printf("验证结果: %v\n\n", hitFirst == 0)
}

func testConcurrentDraw() {
	fmt.Println("=== 测试3: 并发抽奖（分布式锁模拟）===")

	stock := int32(10)
	var successCount int32
	var failCount int32

	var wg sync.WaitGroup
	concurrentUsers := 100

	lock := make(chan struct{}, 1)

	for i := 0; i < concurrentUsers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			select {
			case lock <- struct{}{}:
				if atomic.LoadInt32(&stock) > 0 {
					atomic.AddInt32(&stock, -1)
					atomic.AddInt32(&successCount, 1)
				} else {
					atomic.AddInt32(&failCount, 1)
				}
				<-lock
			default:
				atomic.AddInt32(&failCount, 1)
			}
		}()
	}

	wg.Wait()

	fmt.Printf("初始库存: 10, 并发用户: 100\n")
	fmt.Printf("成功抽奖: %d\n", successCount)
	fmt.Printf("失败/被锁: %d\n", failCount)
	fmt.Printf("剩余库存: %d\n", stock)
	fmt.Printf("验证结果: 成功数=%d, 剩余库存=%d (应为10和0)\n",
		successCount == 10, stock == 0)
	fmt.Println()
}

func testDailyLimit() {
	fmt.Println("=== 测试4: 每日抽奖次数限制 ===")

	maxDraws := 3
	userDraws := make(map[int]int)

	for day := 1; day <= 2; day++ {
		fmt.Printf("第%d天:\n", day)
		for i := 0; i < 5; i++ {
			if userDraws[day] >= maxDraws {
				fmt.Printf("  第%d次尝试: 失败（今日次数已用完）\n", i+1)
			} else {
				userDraws[day]++
				fmt.Printf("  第%d次尝试: 成功（已用%d/3）\n", i+1, userDraws[day])
			}
		}
	}
	fmt.Println()
}

func main() {
	rand.Seed(time.Now().UnixNano())

	testProbability()
	testStockZero()
	testConcurrentDraw()
	testDailyLimit()

	fmt.Println("=== 所有测试完成 ===")
}
