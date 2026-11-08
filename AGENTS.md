# Project location

The active project root is E:\Tool\ĐIỂM, as requested by the user on 2026-11-08.
Make all future source edits in this directory. Do not use the historical copies in E:\Tool\STADINGINGAME, D:\Tool\Codex\2026-10-25\o\outputs\ff-live-score or E:\Tool\INGAME STANDIN as the editing source.
Run the local app with START.cmd. Run tests with node --test tests/*.test.mjs. Tests that bind localhost require local network access.
Preserve the existing Sites project_id in .openai/hosting.json when publishing. This is the existing site, not a new project.

For publication, use a clean temporary checkout from the Sites source helper and copy the verified source from this E directory into that checkout. Keep all actual source edits here; do not modify historical D source copies.
