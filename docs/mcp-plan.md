# MCP Plan

The first milestone is this local prototype. If the taste profile produces useful logo directions, the same functions can be exposed as a small MCP server.

## Proposed Tools

`pinterest.get_boards`

- Input: optional `page_size`, `privacy`, `max_pages`
- Output: normalized board list

`pinterest.get_board_pins`

- Input: `board_id`, optional `section_id`, `page_size`, `max_pages`
- Output: normalized pins with image URLs and source metadata

`preference.analyze_board`

- Input: normalized Pinterest dataset or selected board IDs
- Output: preference profile with evidence

`logo.generate_directions`

- Input: brand name, preference profile, optional constraints
- Output: logo direction notes and SVG assets

## Server Boundary

Keep OAuth token storage outside the MCP tool payload. The MCP server should read an existing token file or secret manager entry, never accept raw tokens from a model message.
