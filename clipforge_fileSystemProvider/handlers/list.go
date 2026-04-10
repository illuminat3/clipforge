package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"clipforge-filesystemprovider/storage"
)

func List(fs *storage.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			httpError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		accountID := strings.TrimPrefix(r.URL.Path, "/list/")
		if accountID == "" {
			httpError(w, http.StatusBadRequest, "accountId is required")
			return
		}

		videos, err := fs.List(accountID)
		if err != nil {
			httpError(w, http.StatusInternalServerError, "listing failure: "+err.Error())
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"videos": videos})
	}
}