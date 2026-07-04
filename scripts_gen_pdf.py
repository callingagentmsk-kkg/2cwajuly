import json, os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

with open('/home/user/webapp/data/batches.json') as f:
    data = json.load(f)

OUT_DIR = '/home/user/webapp/assets/pdfs'
os.makedirs(OUT_DIR, exist_ok=True)

PRIMARY = HexColor('#4C3CE3')
ACCENT = HexColor('#FF6B6B')
DARK = HexColor('#1B1B2F')

styles = getSampleStyleSheet()
title_style = ParagraphStyle('TitleCustom', parent=styles['Title'], fontSize=22, textColor=PRIMARY, alignment=TA_CENTER, spaceAfter=4)
sub_style = ParagraphStyle('SubCustom', parent=styles['Normal'], fontSize=11, textColor=DARK, alignment=TA_CENTER, spaceAfter=14)
h2_style = ParagraphStyle('H2Custom', parent=styles['Heading2'], fontSize=15, textColor=ACCENT, spaceBefore=14, spaceAfter=6)
body_style = ParagraphStyle('BodyCustom', parent=styles['Normal'], fontSize=11, leading=17, spaceAfter=6)
bullet_style = ParagraphStyle('BulletCustom', parent=styles['Normal'], fontSize=11, leading=16, leftIndent=14, spaceAfter=4)
footer_style = ParagraphStyle('FooterCustom', parent=styles['Normal'], fontSize=9, textColor=HexColor('#666666'), alignment=TA_CENTER)

NOTES_TEMPLATE = {
    "Physics": [
        "Chapter ka concept clearly samjhein - definitions aur formulae yaad karein.",
        "Important derivations ko step-by-step likh kar practice karein.",
        "NCERT ke saare in-text aur exercise questions solve karein.",
        "Numericals ki practice daily karein - units ka dhyan rakhein.",
        "Diagram based questions ke liye labelled diagrams practice karein.",
        "Previous year Bihar Board questions is chapter se zaroor solve karein."
    ],
    "Chemistry": [
        "Chapter ki basic terminology aur definitions achhi tarah samjhein.",
        "Chemical equations ko balance karna practice karein.",
        "Important reactions aur unke uses yaad rakhein.",
        "NCERT line-by-line padhein, exercise questions solve karein.",
        "Diagrams (jaise apparatus, structures) achhe se banana practice karein.",
        "Bihar Board previous year questions is chapter se solve karein."
    ],
    "Maths": [
        "Formula sheet banayein aur roz revise karein.",
        "Har concept ke baad NCERT exercise ke questions solve karein.",
        "Step-by-step solution likhne ki practice karein taaki full marks milein.",
        "Important theorems/properties ko samajh kar yaad karein.",
        "Galtiyon ko note karein aur dobara practice karein.",
        "Previous year Bihar Board board paper se questions solve karein."
    ]
}

def make_pdf(subject_name, chapter_title, class_no, filename, duration):
    path = os.path.join(OUT_DIR, filename)
    doc = SimpleDocTemplate(path, pagesize=A4,
                             topMargin=20*mm, bottomMargin=18*mm,
                             leftMargin=18*mm, rightMargin=18*mm)
    story = []
    story.append(Paragraph("CWA SCIENCE CLASSES", title_style))
    story.append(Paragraph("Concept with Abhishek &nbsp;|&nbsp; Abhishek Garg Sir (Physics, Chemistry, Maths)", sub_style))
    story.append(HRFlowable(width="100%", thickness=1.4, color=PRIMARY, spaceAfter=10))

    meta_table = Table([
        [Paragraph(f"<b>Class:</b> {class_no}th (Bihar Board)", body_style),
         Paragraph(f"<b>Subject:</b> {subject_name}", body_style)],
        [Paragraph(f"<b>Chapter:</b> {chapter_title}", body_style),
         Paragraph(f"<b>Video Length:</b> {duration}", body_style)],
    ], colWidths=[85*mm, 85*mm])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor('#F3F1FF')),
        ('BOX', (0,0), (-1,-1), 0.5, PRIMARY),
        ('INNERGRID', (0,0), (-1,-1), 0.4, HexColor('#D9D4FF')),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("Study Notes &amp; Preparation Tips", h2_style))
    for i, tip in enumerate(NOTES_TEMPLATE[subject_name], start=1):
        story.append(Paragraph(f"{i}. {tip}", bullet_style))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Chapter Weightage &amp; Exam Strategy", h2_style))
    story.append(Paragraph(
        f"'{chapter_title}' Bihar Board Class {class_no} {subject_name} ke exam ke liye important chapter hai. "
        "Is chapter se objective aur subjective dono type ke questions puche jaate hain. "
        "Weekly test mein is chapter se questions honge, isliye class video dekhne ke baad NCERT "
        "ke saare questions khud se solve karein aur doubt hone par Abhishek Garg Sir se poochein.",
        body_style))

    story.append(Spacer(1, 10))
    story.append(Paragraph("How to Use This PDF", h2_style))
    story.append(Paragraph(
        "1. Pehle class video (website par upar diya gaya) dhyan se dekhein.<br/>"
        "2. Video dekhte waqt ye PDF saath mein khula rakhein aur notes banayein.<br/>"
        "3. Video khatam hone ke baad in points ko revise karein.<br/>"
        "4. Weekly test mein isi chapter se questions aa sakte hain.",
        body_style))

    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", thickness=0.8, color=HexColor('#CCCCCC'), spaceAfter=8))
    story.append(Paragraph("CWA SCIENCE CLASSES &bull; Admission Helpline: +91 6207434940 &bull; Teacher: Abhishek Garg Sir", footer_style))
    story.append(Paragraph("Bihar Board | Class 9 to 12 | Physics - Chemistry - Maths", footer_style))

    doc.build(story)
    return path

count = 0
for batch in data['batches']:
    class_no = batch['class']
    for subject in batch['subjects']:
        sname = subject['name']
        for ch in subject['chapters']:
            make_pdf(sname, ch['title'], class_no, ch['pdf'], ch['duration'])
            count += 1

print(f"Generated {count} PDFs in {OUT_DIR}")
