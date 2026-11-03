# AGENTS.md

This project should be built from the `src/` directory into a single script. Therefore, **`bin/vtrim` is a committed build artifact**, not source. Never edit it by hand. Instead, edit `src/` and rebuild. The project also assumes that `ffmpeg` and `ffprobe` are available on user PATH.

## Notes

- `src/system/` directory should be the only one that touches the outside world.
- `UnexpectedError` marks "this should be unreachable" invariants introduced by `noUncheckedIndexedAccess`.

## Testing

- tests are colocated as `*.test.ts` next to their subject.
- when testing, mock the filesystem using memfs.
- Mocks for `getVideoDuration` and `getFileSize` **throw by default**. A test that reaches them must `vi.spyOn` and supply a return value. The throw is a deliberate prompt to make the expectation explicit.
