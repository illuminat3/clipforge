package handlers

import (
	"net/http"
	"os/exec"
	"strings"

	"clipforge-filesystemprovider/storage"
)

// Thumbnail serves the first frame of a stored video as a JPEG image.
// Requires ffmpeg to be available on PATH.
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

		filePath, err := fs.VideoFilePath(id)
		if err != nil {
			httpError(w, http.StatusNotFound, "video not found")
			return
		}

		// Extract the first video frame as JPEG and write it directly to stdout.
		cmd := exec.Command(
			"ffmpeg",
			"-i", filePath,
			"-vframes", "1",
			"-f", "image2pipe",
			"-vcodec", "mjpeg",
			"-",
		)

		out, err := cmd.Output()
		if err != nil {
			httpError(w, http.StatusInternalServerError, "thumbnail generation failed")
			return
		}

		w.Header().Set("Content-Type", "image/jpeg")
		w.Write(out)
	}
}
