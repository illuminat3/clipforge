package storage

import "time"

type VideoMeta struct {
	ID        string    `json:"id"`
	AccountID string    `json:"accountId"`
	FileName  string    `json:"fileName"`
	CreatedAt time.Time `json:"createdAt"`
}

type VideoEntry struct {
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	FileName  string    `json:"fileName"`
}