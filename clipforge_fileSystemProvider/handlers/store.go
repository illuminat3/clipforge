package handlers

import (
	"encoding/json"
	"fmt"
	"mime"
	"mime/multipart"
	"net/http"
	"os/exec"
	"strconv"

	"clipforge-filesystemprovider/storage"
)

func Store(fs *storage.FileSystem) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			httpError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		mediaType, params, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
		if err != nil || mediaType != "multipart/form-data" {
			httpError(w, http.StatusBadRequest, "expected multipart/form-data")
			return
		}
		boundary, ok := params["boundary"]
		if !ok {
			httpError(w, http.StatusBadRequest, "missing multipart boundary")
			return
		}

		mr := multipart.NewReader(r.Body, boundary)

		var id, accountID, fileName string

		for {
			part, err := mr.NextPart()
			if err != nil {
				httpError(w, http.StatusBadRequest, "missing file part")
				return
			}

			fieldName := part.FormName()

			switch fieldName {
			case "id":
				id = readSmallPart(part)
			case "accountId":
				accountID = readSmallPart(part)
			case "fileName":
				fileName = readSmallPart(part)
			case "file":
				if id == "" || accountID == "" {
					part.Close()
					httpError(w, http.StatusBadRequest, "id and accountId must appear before the file part")
					return
				}

				if err := fs.Store(id, accountID, fileName, part); err != nil {
					part.Close()
					httpError(w, http.StatusInternalServerError, "storage failure: "+err.Error())
					return
				}

				part.Close()

				// Best-effort: probe duration and persist in metadata.
				if filePath, err := fs.VideoFilePath(id); err == nil {
					if d, err := probeDuration(filePath); err == nil {
						fs.SetDuration(id, d)
					}
				}

				w.WriteHeader(http.StatusOK)
				fmt.Fprintln(w, "stored")
				return
			}

			part.Close()
		}
	}
}

func readSmallPart(p *multipart.Part) string {
	buf := make([]byte, 512)
	n, _ := p.Read(buf)
	return string(buf[:n])
}

// probeDuration runs ffprobe to extract the video duration in seconds.
// Returns an error if ffprobe is unavailable or the duration cannot be parsed.
func probeDuration(filePath string) (float64, error) {
	out, err := exec.Command(
		"ffprobe",
		"-v", "quiet",
		"-print_format", "json",
		"-show_entries", "format=duration",
		filePath,
	).Output()
	if err != nil {
		return 0, fmt.Errorf("ffprobe: %w", err)
	}

	var result struct {
		Format struct {
			Duration string `json:"duration"`
		} `json:"format"`
	}
	if err := json.Unmarshal(out, &result); err != nil {
		return 0, fmt.Errorf("parse ffprobe output: %w", err)
	}

	seconds, err := strconv.ParseFloat(result.Format.Duration, 64)
	if err != nil {
		return 0, fmt.Errorf("parse duration %q: %w", result.Format.Duration, err)
	}
	return seconds, nil
}