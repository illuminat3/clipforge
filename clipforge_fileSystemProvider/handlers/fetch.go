package handlers

import (
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"clipforge-filesystemprovider/storage"
)

func Fetch(fs *storage.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			httpError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		id := strings.TrimPrefix(r.URL.Path, "/fetch/")
		if id == "" {
			httpError(w, http.StatusBadRequest, "id is required")
			return
		}

		meta, err := fs.FindMeta(id)
		if err != nil {
			httpError(w, http.StatusNotFound, "video not found")
			return
		}

		f, size, err := fs.Open(id)
		if err != nil {
			httpError(w, http.StatusNotFound, "video file not found")
			return
		}
		defer f.Close()

		w.Header().Set("Content-Type", contentTypeFor(meta.FileName))
		w.Header().Set("Accept-Ranges", "bytes")

		rangeHeader := r.Header.Get("Range")
		if rangeHeader == "" {
			w.Header().Set("Content-Length", strconv.FormatInt(size, 10))
			w.WriteHeader(http.StatusOK)
			io.Copy(w, f)
			return
		}

		start, end, ok := parseRange(rangeHeader, size)
		if !ok {
			w.Header().Set("Content-Range", fmt.Sprintf("bytes */%d", size))
			httpError(w, http.StatusRequestedRangeNotSatisfiable, "invalid or out-of-bounds range")
			return
		}

		length := end - start + 1

		if _, err := f.Seek(start, io.SeekStart); err != nil {
			httpError(w, http.StatusInternalServerError, "seek failed")
			return
		}

		w.Header().Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, size))
		w.Header().Set("Content-Length", strconv.FormatInt(length, 10))
		w.WriteHeader(http.StatusPartialContent)
		io.CopyN(w, f, length)
	}
}

func parseRange(header string, size int64) (int64, int64, bool) {
	header = strings.TrimPrefix(header, "bytes=")
	parts := strings.SplitN(header, "-", 2)
	if len(parts) != 2 {
		return 0, 0, false
	}

	var start, end int64

	if parts[0] == "" {
		suffix, err := strconv.ParseInt(parts[1], 10, 64)
		if err != nil || suffix <= 0 {
			return 0, 0, false
		}
		start = size - suffix
		end = size - 1
	} else {
		var err error
		start, err = strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return 0, 0, false
		}
		if parts[1] == "" {
			end = size - 1
		} else {
			end, err = strconv.ParseInt(parts[1], 10, 64)
			if err != nil {
				return 0, 0, false
			}
		}
	}

	if start < 0 || end >= size || start > end {
		return 0, 0, false
	}

	return start, end, true
}

func contentTypeFor(fileName string) string {
	switch strings.ToLower(filepath.Ext(fileName)) {
	case ".mp4":
		return "video/mp4"
	case ".webm":
		return "video/webm"
	case ".mov":
		return "video/quicktime"
	case ".mkv":
		return "video/x-matroska"
	case ".avi":
		return "video/x-msvideo"
	default:
		return "video/mp4"
	}
}