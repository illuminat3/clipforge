package server

import (
	"net/http"

	"clipforge-filesystemprovider/handlers"
	"clipforge-filesystemprovider/storage"
)

func NewRouter(fs *storage.FileSystem) *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("/store", handlers.Store(fs))
	mux.HandleFunc("/fetch/", handlers.Fetch(fs))
	mux.HandleFunc("/delete/", handlers.Delete(fs))
	mux.HandleFunc("/list/", handlers.List(fs))
	mux.HandleFunc("/thumbnail/", handlers.Thumbnail(fs))

	return mux
}