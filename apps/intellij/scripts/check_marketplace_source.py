#!/usr/bin/env python3
"""Verify the public JetBrains Marketplace source-code resource."""

import json
from urllib.request import Request, urlopen


EXPECTED_SOURCE = "https://github.com/ischouten/human-eye"
PLUGIN_API = "https://plugins.jetbrains.com/api/plugins/35055"


with urlopen(PLUGIN_API, timeout=15) as response:
    source = json.load(response)["urls"]["sourceCodeUrl"]

if source != EXPECTED_SOURCE:
    raise SystemExit(f"Marketplace Source Code URL is {source!r}; expected {EXPECTED_SOURCE!r}")

with urlopen(Request(source, method="HEAD"), timeout=15) as response:
    if response.status != 200:
        raise SystemExit(f"Marketplace Source Code URL returned HTTP {response.status}")

print(f"Marketplace Source Code URL is correct and publicly reachable: {source}")
