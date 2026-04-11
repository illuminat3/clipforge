package storage

import "time"

type VideoMeta struct {
	ID              string    `json:"id"`
	AccountID       string    `json:"accountId"`
	FileName        string    `json:"fileName"`
	CreatedAt       time.Time `json:"createdAt"`
	DurationSeconds float64   `json:"durationSeconds"`
}

type VideoEntry struct {
	ID              string    `json:"id"`
	CreatedAt       time.Time `json:"createdAt"`
	FileName        string    `json:"fileName"`
	DurationSeconds float64   `json:"durationSeconds"`
}