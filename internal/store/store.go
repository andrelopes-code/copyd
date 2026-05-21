package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	_ "modernc.org/sqlite"

	"copyd/internal/item"
)

const schema = `
CREATE TABLE IF NOT EXISTS items (
    id            TEXT PRIMARY KEY,
    content       TEXT NOT NULL,
    content_type  TEXT NOT NULL,
    preview       TEXT NOT NULL,
    pinned        INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL,
    last_used_at  INTEGER NOT NULL,
    use_count     INTEGER NOT NULL DEFAULT 1,
    size          INTEGER NOT NULL,
    source_app    TEXT,
    image_path    TEXT,
    width         INTEGER,
    height        INTEGER
);

CREATE INDEX IF NOT EXISTS idx_items_last_used ON items(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_pinned ON items(pinned);
`

type Store struct {
	db *sql.DB
}

func Open(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path+"?_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)")
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if _, err := db.ExecContext(context.Background(), schema); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("apply schema: %w", err)
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) FindByID(ctx context.Context, id string) (bool, error) {
	var x int
	err := s.db.QueryRowContext(ctx, `SELECT 1 FROM items WHERE id = ?`, id).Scan(&x)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (s *Store) Insert(ctx context.Context, it item.Item, imagePath string) error {
	_, err := s.db.ExecContext(ctx, `
INSERT INTO items
    (id, content, content_type, preview, pinned, created_at, last_used_at, use_count, size, source_app, image_path, width, height)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
		it.ID, it.Content, string(it.ContentType), it.Preview, boolToInt(it.Pinned),
		it.CreatedAt, it.LastUsedAt, it.UseCount, it.Size,
		nullable(it.SourceApp), nullable(imagePath), nullableInt(it.Width), nullableInt(it.Height),
	)
	return err
}

func (s *Store) Touch(ctx context.Context, id string, ts int64) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE items SET last_used_at = ?, use_count = use_count + 1 WHERE id = ?`, ts, id)
	return err
}

func (s *Store) Pin(ctx context.Context, id string, pinned bool) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE items SET pinned = ? WHERE id = ?`, boolToInt(pinned), id)
	return err
}

func (s *Store) List(ctx context.Context, query string, limit int) ([]item.Item, error) {
	const cols = `id, content, content_type, preview, pinned, created_at, last_used_at, use_count, size,
                  COALESCE(source_app, ''), COALESCE(width, 0), COALESCE(height, 0)`

	var (
		rows *sql.Rows
		err  error
	)
	if query == "" {
		rows, err = s.db.QueryContext(ctx,
			`SELECT `+cols+` FROM items ORDER BY pinned DESC, last_used_at DESC LIMIT ?`, limit)
	} else {
		like := "%" + strings.ToLower(query) + "%"
		rows, err = s.db.QueryContext(ctx,
			`SELECT `+cols+` FROM items WHERE LOWER(content) LIKE ? ORDER BY last_used_at DESC LIMIT ?`,
			like, limit)
	}
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	out := make([]item.Item, 0, 64)
	for rows.Next() {
		var (
			it       item.Item
			ct       string
			pinnedI  int
		)
		if err := rows.Scan(
			&it.ID, &it.Content, &ct, &it.Preview, &pinnedI,
			&it.CreatedAt, &it.LastUsedAt, &it.UseCount, &it.Size,
			&it.SourceApp, &it.Width, &it.Height,
		); err != nil {
			return nil, err
		}
		it.ContentType = item.ContentType(ct)
		it.Pinned = pinnedI != 0
		out = append(out, it)
	}
	return out, rows.Err()
}

func (s *Store) Get(ctx context.Context, id string) (item.Item, string, error) {
	var (
		it        item.Item
		ct        string
		imagePath string
		pinnedI   int
	)
	row := s.db.QueryRowContext(ctx, `
SELECT id, content, content_type, preview, pinned, created_at, last_used_at, use_count, size,
       COALESCE(source_app, ''), COALESCE(image_path, ''), COALESCE(width, 0), COALESCE(height, 0)
FROM items WHERE id = ?`, id)
	if err := row.Scan(
		&it.ID, &it.Content, &ct, &it.Preview, &pinnedI,
		&it.CreatedAt, &it.LastUsedAt, &it.UseCount, &it.Size,
		&it.SourceApp, &imagePath, &it.Width, &it.Height,
	); err != nil {
		return item.Item{}, "", err
	}
	it.ContentType = item.ContentType(ct)
	it.Pinned = pinnedI != 0
	return it, imagePath, nil
}

func (s *Store) Delete(ctx context.Context, id string) (string, error) {
	var imagePath string
	err := s.db.QueryRowContext(ctx,
		`SELECT COALESCE(image_path, '') FROM items WHERE id = ?`, id).Scan(&imagePath)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	if _, err := s.db.ExecContext(ctx, `DELETE FROM items WHERE id = ?`, id); err != nil {
		return "", err
	}
	return imagePath, nil
}

func (s *Store) ClearUnpinned(ctx context.Context) ([]string, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT image_path FROM items WHERE pinned = 0 AND image_path IS NOT NULL AND image_path != ''`)
	if err != nil {
		return nil, err
	}
	var paths []string
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			_ = rows.Close()
			return nil, err
		}
		paths = append(paths, p)
	}
	_ = rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if _, err := s.db.ExecContext(ctx, `DELETE FROM items WHERE pinned = 0`); err != nil {
		return nil, err
	}
	return paths, nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func nullableInt(n int) any {
	if n == 0 {
		return nil
	}
	return n
}
