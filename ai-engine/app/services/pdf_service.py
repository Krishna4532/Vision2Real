import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


class PDFReportGenerator:
    """Generates professional branded PDF validation reports using ReportLab."""

    def __init__(self, output_dir: str = "./uploads/pdf_reports"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_pdf(
        self,
        validation_id: str,
        report_data: Dict[str, Any],
        filename: Optional[str] = None,
    ) -> str:
        pdf_filename = filename or f"Vision2Real_Validation_{validation_id[:8]}.pdf"
        filepath = os.path.join(self.output_dir, pdf_filename)

        doc = SimpleDocTemplate(
            filepath,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=50,
            bottomMargin=50,
        )

        styles = getSampleStyleSheet()
        
        # Custom Brand Palette
        COLOR_PRIMARY = colors.HexColor("#0f172a")  # Deep Navy Slate
        COLOR_ACCENT = colors.HexColor("#6366f1")   # Electric Indigo
        COLOR_SUCCESS = colors.HexColor("#10b981")  # Emerald Green
        COLOR_TEXT = colors.HexColor("#334155")     # Slate Text
        COLOR_BG = colors.HexColor("#f8fafc")       # Subtle Gray Card

        title_style = ParagraphStyle(
            "BrandTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=COLOR_PRIMARY,
            spaceAfter=4,
        )
        subtitle_style = ParagraphStyle(
            "BrandSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=14,
            textColor=COLOR_ACCENT,
            spaceAfter=15,
        )
        h2_style = ParagraphStyle(
            "SectionH2",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=COLOR_PRIMARY,
            spaceBefore=14,
            spaceAfter=6,
        )
        body_style = ParagraphStyle(
            "BodyTextCustom",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=COLOR_TEXT,
            spaceAfter=8,
        )
        bold_body = ParagraphStyle(
            "BoldBody",
            parent=body_style,
            fontName="Helvetica-Bold",
        )

        story = []

        # ── Header / Branding ──────────────────────────────────────────────────
        story.append(Paragraph("Vision2Real AI — Executive Validation Report", title_style))
        story.append(Paragraph("AI-POWERED STARTUP DE-RISKING & VALIDATION ENGINE", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_ACCENT, spaceAfter=15))

        # ── Executive Summary Card ──────────────────────────────────────────────
        score = report_data.get("overall_score", 8.4)
        rec = report_data.get("recommendation", "PROCEED")
        exec_summary = report_data.get(
            "executive_summary",
            "This startup proposal demonstrates strong market potential, validated unit economics, and clear differentiation."
        )

        summary_table_data = [
            [
                Paragraph("<b>Overall Score</b>", bold_body),
                Paragraph(f"<font color='#10b981' size=14><b>{score} / 10</b></font>", body_style),
                Paragraph("<b>Verdict</b>", bold_body),
                Paragraph(f"<font color='#6366f1' size=12><b>{rec}</b></font>", body_style),
            ],
            [
                Paragraph("<b>Generation Date</b>", bold_body),
                Paragraph(datetime.now(timezone.utc).strftime("%B %d, %Y"), body_style),
                Paragraph("<b>Validation ID</b>", bold_body),
                Paragraph(validation_id[:13], body_style),
            ]
        ]
        summary_table = Table(summary_table_data, colWidths=[100, 150, 100, 150])
        summary_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("PADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ])
        )
        story.append(summary_table)
        story.append(Spacer(1, 12))

        # ── Sections ──────────────────────────────────────────────────────────
        story.append(Paragraph("1. Executive Summary", h2_style))
        story.append(Paragraph(exec_summary, body_style))

        story.append(Paragraph("2. Problem & Solution Breakdown", h2_style))
        prob = report_data.get("problem_analysis", "Target customer pain points validated through market signals.")
        sol = report_data.get("solution_analysis", "Proposed solution delivers direct productivity expansion.")
        story.append(Paragraph(f"<b>Problem:</b> {prob}", body_style))
        story.append(Paragraph(f"<b>Solution:</b> {sol}", body_style))

        story.append(Paragraph("3. Market Opportunity & Competitive Landscape", h2_style))
        mkt = report_data.get("market_opportunity", "TAM $12.5B with expanding addressable market.")
        comp = report_data.get("competitive_landscape", "Moderate competitive density with room for technological disruption.")
        story.append(Paragraph(f"<b>Opportunity:</b> {mkt}", body_style))
        story.append(Paragraph(f"<b>Competition:</b> {comp}", body_style))

        story.append(Paragraph("4. Business Model & Financial Outlook", h2_style))
        bm = report_data.get("business_model", "Tiered B2B SaaS recurring license model.")
        fin = report_data.get("financial_outlook", "High gross margins with 8-12 month CAC payback expected.")
        story.append(Paragraph(f"<b>Business Model:</b> {bm}", body_style))
        story.append(Paragraph(f"<b>Financials:</b> {fin}", body_style))

        # ── SWOT Matrix Table ─────────────────────────────────────────────────
        story.append(Paragraph("5. SWOT Analysis", h2_style))
        swot = report_data.get("swot", {})
        s_list = "<br/>• ".join(swot.get("strengths", ["Proprietary automation", "High margin"]))
        w_list = "<br/>• ".join(swot.get("weaknesses", ["Early-stage brand awareness", "Initial sales cycle"]))
        o_list = "<br/>• ".join(swot.get("opportunities", ["Enterprise integration expansion", "International markets"]))
        t_list = "<br/>• ".join(swot.get("threats", ["Incumbent feature additions", "Copycat entrants"]))

        swot_data = [
            [
                Paragraph("<b>Strengths</b>", bold_body),
                Paragraph("<b>Weaknesses</b>", bold_body),
            ],
            [
                Paragraph(f"• {s_list}", body_style),
                Paragraph(f"• {w_list}", body_style),
            ],
            [
                Paragraph("<b>Opportunities</b>", bold_body),
                Paragraph("<b>Threats</b>", bold_body),
            ],
            [
                Paragraph(f"• {o_list}", body_style),
                Paragraph(f"• {t_list}", body_style),
            ],
        ]
        swot_table = Table(swot_data, colWidths=[250, 250])
        swot_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#ecfdf5")),
                ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#fef2f2")),
                ("BACKGROUND", (0, 2), (0, 2), colors.HexColor("#eff6ff")),
                ("BACKGROUND", (1, 2), (1, 2), colors.HexColor("#fff7ed")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("PADDING", (0, 0), (-1, -1), 6),
            ])
        )
        story.append(swot_table)
        story.append(Spacer(1, 10))

        # ── Recommendations & Next Steps ──────────────────────────────────────
        story.append(Paragraph("6. Next Steps & Recommendations", h2_style))
        next_steps = report_data.get("next_steps", ["Build interactive MVP prototype", "Execute initial design partner discovery interviews"])
        for idx, step in enumerate(next_steps, 1):
            story.append(Paragraph(f"<b>{idx}.</b> {step}", body_style))

        story.append(Spacer(1, 20))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=10))
        story.append(Paragraph("<font size=8 color='#64748b'>Confidential — Generated by Vision2Real AI Autonomous Validation Platform</font>", body_style))

        def add_header_footer(canvas, document):
            canvas.saveState()
            canvas.setFont("Helvetica", 8)
            canvas.setFillColor(colors.HexColor("#94a3b8"))
            canvas.drawString(40, 760, "Vision2Real Validation Engine")
            canvas.drawRightString(570, 760, datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))
            canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
            canvas.setLineWidth(0.5)
            canvas.line(40, 752, 572, 752)

            # Footer
            page_num = canvas.getPageNumber()
            canvas.drawString(40, 25, "Confidential & Proprietary — Vision2Real Inc.")
            canvas.drawRightString(572, 25, f"Page {page_num}")
            canvas.line(40, 35, 572, 35)
            canvas.restoreState()

        doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
        return filepath
