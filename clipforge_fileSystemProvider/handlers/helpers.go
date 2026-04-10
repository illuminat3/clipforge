package handlers

import "net/http"

func httpError(w http.ResponseWriter, status int, msg string) {
	http.Error(w, msg, status)
}