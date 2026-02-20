import pdfplumber

def extract_text_from_pdf(file_path: str) -> str:
    text_parts = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)

def chunk_text(text: str, max_chars: int = 6000) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    chunks = []
    paragraphs = text.split("\n\n")
    current_chunk = ""
    for para in paragraphs:
        if len(current_chunk) + len(para) + 2 > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para
        else:
            current_chunk += "\n\n" + para
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    return chunks
