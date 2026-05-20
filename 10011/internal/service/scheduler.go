package service

import (
	"log"

	"github.com/robfig/cron/v3"
)

type Scheduler struct {
	cron    *cron.Cron
	service *ShortLinkService
}

func NewScheduler(service *ShortLinkService) *Scheduler {
	return &Scheduler{
		cron:    cron.New(),
		service: service,
	}
}

func (s *Scheduler) Start() {
	_, err := s.cron.AddFunc("0 0 * * *", func() {
		log.Println("Starting log cleanup job...")
		err := s.service.CleanOldLogs()
		if err != nil {
			log.Printf("Error cleaning old logs: %v", err)
		} else {
			log.Println("Log cleanup job completed successfully")
		}
	})

	if err != nil {
		log.Printf("Error scheduling cleanup job: %v", err)
		return
	}

	s.cron.Start()
	log.Println("Scheduler started, log cleanup job scheduled daily at midnight")
}

func (s *Scheduler) Stop() {
	s.cron.Stop()
}
