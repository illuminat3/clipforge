package handlers

import (
	"io"
	"net/http"
	"strconv"
	"strings"

	"clipforge-filesystemprovider/storage"
)

func Thumbnail(fs *storage.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			httpError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		id := strings.TrimPrefix(r.URL.Path, "/thumbnail/")
		if id == "" {
			httpError(w, http.StatusBadRequest, "id is required")
			return
		}

		f, size, err := fs.OpenThumbnail(id)
		if err != nil {
			httpError(w, http.StatusNotFound, "thumbnail not found")
			return
		}
		defer f.Close()

		w.Header().Set("Content-Type", "image/jpeg")
		w.Header().Set("Content-Length", strconv.FormatInt(size, 10))
		w.WriteHeader(http.StatusOK)
		io.Copy(w, f)
	}
}
