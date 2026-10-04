#!/usr/bin/env python3
"""Local stand-in for the Cloudflare deployment: serves cf-assets/ with CORS, so the site can be
tested offline. Point the site at it from the browser console:
    localStorage.setItem('wtv-cdn-base', 'http://127.0.0.1:8201')
Usage: python3 tools/dev-cdn.py [port]"""
import functools
import http.server
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cf-assets')


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8201
with http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Handler, directory=ROOT)) as srv:
    srv.serve_forever()
