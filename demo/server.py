#!/usr/bin/env python3
"""Tiny static server with explicit JS MIME type for ES modules."""
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class JSHandler(SimpleHTTPRequestHandler):
    def guess_type(self, path):
        if path.endswith('.js') or path.endswith('.mjs'):
            return 'application/javascript'
        if path.endswith('.json'):
            return 'application/json'
        return super().guess_type(path)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f'Serving on http://localhost:{port}/', flush=True)
    HTTPServer(('', port), JSHandler).serve_forever()


if __name__ == '__main__':
    main()