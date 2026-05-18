from pathlib import Path
root = Path('apps/web/src/data/articles')
count = 0
for path in sorted(root.glob('*.md')):
    text = path.read_text()
    lines = text.splitlines()
    out = []
    in_frontmatter = False
    frontmatter_done = False
    removed = False
    for i, line in enumerate(lines):
        if i == 0 and line.strip() == '---':
            in_frontmatter = True
            out.append(line)
            continue
        if in_frontmatter and line.strip() == '---':
            in_frontmatter = False
            frontmatter_done = True
            out.append(line)
            continue
        if frontmatter_done and not removed and line.startswith('# '):
            removed = True
            count += 1
            continue
        out.append(line)
    new_text = '\n'.join(out) + ('\n' if text.endswith('\n') else '')
    if new_text != text:
        path.write_text(new_text)
        print(f'updated {path}')
print(f'removed {count} h1 titles')
