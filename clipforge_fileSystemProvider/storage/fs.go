package storage

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

const copyBufSize = 4 * 1024 * 1024

type FileSystem struct {
	root string
}

func NewFileSystem(root string) *FileSystem {
	return &FileSystem{root: root}
}

func (fs *FileSystem) Init() error {
	return os.MkdirAll(fs.root, 0755)
}

func (fs *FileSystem) Store(id, accountID, fileName string, r io.Reader) error {
	if err := os.MkdirAll(fs.accountDir(accountID), 0755); err != nil {
		return fmt.Errorf("create account dir: %w", err)
	}

	dst, err := os.Create(fs.videoPath(accountID, id))
	if err != nil {
		return fmt.Errorf("create video file: %w", err)
	}
	defer dst.Close()

	bw := bufio.NewWriterSize(dst, copyBufSize)
	if _, err := io.Copy(bw, r); err != nil {
		return fmt.Errorf("write video file: %w", err)
	}
	if err := bw.Flush(); err != nil {
		return fmt.Errorf("flush video file: %w", err)
	}

	if err := dst.Sync(); err != nil {
		return fmt.Errorf("sync video file: %w", err)
	}

	meta := VideoMeta{
		ID:        id,
		AccountID: accountID,
		FileName:  fileName,
		CreatedAt: time.Now().UTC(),
	}
	return fs.writeMeta(meta)
}

func (fs *FileSystem) Open(id string) (*os.File, int64, error) {
	meta, err := fs.FindMeta(id)
	if err != nil {
		return nil, 0, err
	}

	f, err := os.Open(fs.videoPath(meta.AccountID, id))
	if err != nil {
		return nil, 0, fmt.Errorf("open video: %w", err)
	}

	stat, err := f.Stat()
	if err != nil {
		f.Close()
		return nil, 0, fmt.Errorf("stat video: %w", err)
	}

	return f, stat.Size(), nil
}

func (fs *FileSystem) FindMeta(id string) (VideoMeta, error) {
	entries, err := os.ReadDir(fs.root)
	if err != nil {
		return VideoMeta{}, fmt.Errorf("read storage root: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		p := filepath.Join(fs.root, entry.Name(), id+".json")
		meta, err := fs.readMeta(p)
		if err == nil {
			return meta, nil
		}
	}

	return VideoMeta{}, fmt.Errorf("video %q not found", id)
}

func (fs *FileSystem) List(accountID string) ([]VideoEntry, error) {
	dir := fs.accountDir(accountID)
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return []VideoEntry{}, nil
		}
		return nil, fmt.Errorf("read account dir: %w", err)
	}

	var videos []VideoEntry
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}

		meta, err := fs.readMeta(filepath.Join(dir, entry.Name()))
		if err != nil {
			continue
		}

		videos = append(videos, VideoEntry{
			ID:        meta.ID,
			CreatedAt: meta.CreatedAt,
			FileName:  meta.FileName,
		})
	}

	if videos == nil {
		videos = []VideoEntry{}
	}
	return videos, nil
}

func (fs *FileSystem) Delete(id string) error {
	meta, err := fs.FindMeta(id)
	if err != nil {
		return err
	}

	if err := removeIfExists(fs.videoPath(meta.AccountID, id)); err != nil {
		return fmt.Errorf("delete video file: %w", err)
	}

	if err := removeIfExists(fs.metaPath(meta.AccountID, id)); err != nil {
		return fmt.Errorf("delete metadata: %w", err)
	}

	return nil
}

func (fs *FileSystem) accountDir(accountID string) string {
	return filepath.Join(fs.root, accountID)
}

func (fs *FileSystem) videoPath(accountID, id string) string {
	return filepath.Join(fs.accountDir(accountID), id+".bin")
}

func (fs *FileSystem) metaPath(accountID, id string) string {
	return filepath.Join(fs.accountDir(accountID), id+".json")
}

func (fs *FileSystem) writeMeta(meta VideoMeta) error {
	data, err := json.Marshal(meta)
	if err != nil {
		return fmt.Errorf("marshal metadata: %w", err)
	}
	if err := os.WriteFile(fs.metaPath(meta.AccountID, meta.ID), data, 0644); err != nil {
		return fmt.Errorf("write metadata: %w", err)
	}
	return nil
}

func (fs *FileSystem) readMeta(path string) (VideoMeta, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return VideoMeta{}, err
	}
	var meta VideoMeta
	if err := json.Unmarshal(data, &meta); err != nil {
		return VideoMeta{}, fmt.Errorf("unmarshal %q: %w", path, err)
	}
	return meta, nil
}

// VideoFilePath returns the filesystem path to the stored video file for the given ID.
func (fs *FileSystem) VideoFilePath(id string) (string, error) {
	meta, err := fs.FindMeta(id)
	if err != nil {
		return "", err
	}
	return fs.videoPath(meta.AccountID, id), nil
}

// SetDuration updates the stored duration for an existing video.
func (fs *FileSystem) SetDuration(id string, durationSeconds float64) error {
	meta, err := fs.FindMeta(id)
	if err != nil {
		return err
	}
	meta.DurationSeconds = durationSeconds
	return fs.writeMeta(meta)
}

func removeIfExists(path string) error {
	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}