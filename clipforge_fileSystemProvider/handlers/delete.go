package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"clipforge-filesystemprovider/storage"
)

func Delete(fs *storage.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			httpError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		id := strings.TrimPrefix(r.URL.Path, "/delete/")
		if id == "" {
			httpError(w, http.StatusBadRequest, "id is required")
			return
		}

		if err := fs.Delete(id); err != nil {
			httpError(w, http.StatusNotFound, "video not found")
			return
		}

		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "deleted")
	}
}