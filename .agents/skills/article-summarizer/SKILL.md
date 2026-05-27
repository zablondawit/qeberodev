---
name: article-summarizer
description: >
  Summarize any markdown article file and save the summary to a specified
  output path or a default summary location.
---

# Article Summarizer Skill

## Purpose
Summarize any markdown article file and save the summary to a specified output location.

## Activation
Use this skill when the user asks to summarize a markdown article, with or without a custom output path.

## Task Definition
When invoked with a source file and optional output path, this skill:
1. Reads the markdown article file
2. Extracts and analyzes the key concepts, sections, and main ideas
3. Generates a well-structured summary with appropriate headings
4. Saves the summary to the specified output location, or a default location if none is provided

## How to Use

### Basic Invocation
```bash
# Summarize a file to default location
copilot "summarize @path/to/article.md"
```

### With Custom Output Path
```bash
# Summarize and save to specific location
copilot "summarize @path/to/article.md and save to output/path/summary.md"
```

## Instructions for Agents

### Step 1: Read the Source File
- Accept a file path via `@` reference or direct user input
- Use the `view` tool, or the environment's equivalent file-read tool, to read the complete markdown file
- Note the article title, frontmatter, heading structure, and major sections

### Step 2: Analyze Content
- Identify the key concepts and main points
- Extract subsections and the purpose of each section
- Determine the article's primary message, guidance, and recommendations
- Preserve important technical context where needed

### Step 3: Generate Summary
Create a markdown summary with:
- **Title**: `Summary: [Original Article Title]`
- **Overview**: 1-2 sentence description of what the article covers
- **Key Concepts**: Main ideas presented in the article
- **Main Sections**: Grouped by topic with brief descriptions
- **Practical Points**: Implementation details, recommendations, or checklists
- **Key Takeaway**: The primary conclusion or recommendation

### Step 4: Determine Output Path
- If the user provides an output path, use it
- If no output path is provided, use this default pattern: `data/generated/article/summary/[filename].md`
- Preserve the source filename stem for `[filename]`
- Create parent directories if they do not exist

### Step 5: Save Summary
- Use `bash`, or the environment's equivalent shell tool, to create directories if needed
- Use the `create` tool, or the environment's equivalent file-write tool, to save the summary file
- Confirm that the summary file was created successfully
- Report the final output path back to the user

## Example Output Structure

```markdown
# Summary: [Article Title]

[Brief overview paragraph]

## Key Concepts
- Concept 1 description
- Concept 2 description
- Concept 3 description

## Main Sections

### Section 1
Description of what's covered

### Section 2
Description of what's covered

## Practical Implementation
- Implementation detail 1
- Implementation detail 2

## Key Recommendation
[Primary takeaway from the article]
```

## Success Criteria
- Source file is read completely
- Summary captures the main ideas accurately
- Summary is well-structured with clear headings
- Output file is created at the specified or default location
- User is informed of completion with the saved file path

## Notes
- Works with any markdown article file
- Summaries should target roughly 30-50% of the original length
- Maintain technical accuracy and context
- Preserve code examples only when they are central to understanding
- Keep tone consistent with the original article
- Prefer concise summaries over exhaustive rewrites

## Agent Behavior Rules
- Do not skip sections without reading them
- Do not invent missing facts or conclusions
- If the source file path is ambiguous, resolve the correct file before summarizing
- If the output path is invalid, choose the default path and inform the user
- If the article is very long, prioritize the most actionable and structural information
- If frontmatter exists, use it to improve context but summarize the article body primarily

## Completion Message
After saving, respond with:
- Source file summarized
- Output file path
- Short note on what the summary contains
- Any fallback behavior used, such as default output path
'}Japgollyassistant to=functions.read_file մեկնաբանություն  彩神争霸app 无码不卡高清免费_json={