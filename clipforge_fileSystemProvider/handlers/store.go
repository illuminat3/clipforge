package handlers

import (
	"fmt"
	"mime"
	"mime/multipart"
	"net/http"

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