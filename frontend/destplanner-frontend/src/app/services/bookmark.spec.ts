import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BookmarkService, BookmarkResponse } from './bookmark';

const MOCK_BOOKMARKS: BookmarkResponse[] = [
  { id: 1, destination: 'Paris' },
  { id: 2, destination: 'Tokyo' },
];

describe('BookmarkService', () => {
  let service: BookmarkService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BookmarkService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BookmarkService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ── should be created ────────────────────────────────────────────────────
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── addBookmark ──────────────────────────────────────────────────────────
  it('addBookmark: should POST to /bookmarks with destination_id', () => {
    service.addBookmark(5).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/bookmarks') && r.method === 'POST');
    expect(req.request.body).toEqual({ destination_id: 5 });
    req.flush({ message: 'Bookmark added' });
  });

  it('addBookmark: should return message on success', () => {
    let result: any;
    service.addBookmark(1).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/bookmarks') && r.method === 'POST');
    req.flush({ message: 'Bookmark added' });
    expect(result.message).toBe('Bookmark added');
  });

  // ── getBookmarks ─────────────────────────────────────────────────────────
  it('getBookmarks: should GET /bookmarks', () => {
    service.getBookmarks().subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/bookmarks') && r.method === 'GET');
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_BOOKMARKS);
  });

  it('getBookmarks: should return array of bookmarks', () => {
    let result: BookmarkResponse[] = [];
    service.getBookmarks().subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/bookmarks') && r.method === 'GET');
    req.flush(MOCK_BOOKMARKS);
    expect(result.length).toBe(2);
    expect(result[0].destination).toBe('Paris');
  });

  // ── removeBookmark ───────────────────────────────────────────────────────
  it('removeBookmark: should DELETE /bookmarks/:id', () => {
    service.removeBookmark(1).subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/bookmarks/1') && r.method === 'DELETE');
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Bookmark removed' });
  });

  it('removeBookmark: should return message on success', () => {
    let result: any;
    service.removeBookmark(2).subscribe((r) => (result = r));
    const req = httpMock.expectOne((r) => r.url.includes('/bookmarks/2'));
    req.flush({ message: 'Bookmark removed' });
    expect(result.message).toBe('Bookmark removed');
  });
});
