# HOSYOND 5-inch DSI profile

This profile stages the default 800x480 landscape kiosk assumptions and the boot fragment needed by the worker-1 image pipeline.

## Current assumptions

- Raspberry Pi 4 mainline KMS stack
- 800x480 preferred kiosk resolution
- touch input exposed through the normal Linux input subsystem

## Follow-up validation

- Confirm the exact HOSYOND SKU and any required overlay/download bundle
- Adjust the fragment if the panel needs vendor-specific timing or rotation flags
- Capture hardware evidence with `matterhub-verify-display`
