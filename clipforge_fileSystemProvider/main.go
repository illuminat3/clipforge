package main

import (
	"log"
	"net/http"
	"os"

	"clipforge-filesystemprovider/server"
	"clipforge-filesystemprovider/storage"
)

func main() {
	storageRoot := envOr("STORAGE_ROOT", "videos")
	port := envOr("PORT", "8080")

	fs := storage.NewFileSystem(storageRoot)

	if err := fs.Init(); err != nil {
		log.Fatalf("failed to initialise storage root %q: %v", storageRoot, err)
	}

	mux := server.NewRouter(fs)

	addr := ":" + port
	log.Printf("clipforge-filesystemprovider listening on %s (root: %s)", addr, storageRoot)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}