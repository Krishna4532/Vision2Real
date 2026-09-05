\# Vision2Real Build Rules Version: 1.0 Status: ACTIVE

Owner: Vision2Real Engineering

- \---

\# Purpose

This document defines the engineering rules, architectural principles, design constraints, and implementation standards for the Vision2Real platform.

Every implementation must follow this document.

If any implementation contradicts these rules, this document takes precedence.

- \---

\# Vision

Vision2Real exists to transform an idea into a real product.

Idea ↓

AI Validation ↓

Reality Sprint


↓

Build Request ↓

Development ↓

Launch

Every feature should reinforce this journey.

Never build features that distract from this experience.

- \---

\# Core Philosophy

Vision2Real is:

• premium • trustworthy • minimal • technical • fast • evidence-driven

Never design for novelty.


Always design for clarity.

- \---

\# Project Structure

Vision2Real/

├── ai-engine/ │ ├── web-app/ │ ├── docs/ │

└── README.md

- \---

\## ai-engine

Responsible for:

- FastAPI

• LangGraph

• AI Agents

• Research


• Report generation

• Business logic

• Authentication backend

• Database

The frontend must never duplicate backend logic.

- \---

\## web-app

Responsible for:

- User experience

- Interface

• Animations

- Dashboards

- Forms

• API communication


• Authentication UI

The frontend should only consume APIs.

Never recreate backend intelligence.

- \---

\# Source of Truth Priority

Whenever there is uncertainty, follow this order.

1. Build Rules 2. Design Audit 3. Approved Stitch Designs 4. Design System 5. Backend API

6. Individual developer preference

Developer preference is always last.

- \---

\# Architecture Rules

Single repository.

Separate frontend and backend.


No duplicated business logic.

No duplicated API logic.

No duplicated authentication.

Every module must have a clear responsibility.

\---

\# Design Rules

Never invent a new design language.

Use the approved Vision2Real design system.

Use existing spacing.

Use existing typography.

Use existing colors.

Use existing shadows.

Use existing animations.

Consistency is more important than creativity.

\---


\# Component Rules

If the same UI appears twice,

it becomes a reusable component.

Never duplicate:

Buttons

Cards

Inputs

Badges

Modals

Sidebar

Navbar

Journey Stepper

Search

Tables


Loading states

Empty states

Dialogs

Notifications

Everything reusable belongs inside components/.

\---

\# Layout Rules

Only three layouts exist.

Public Layout

Founder Layout

Admin Layout

Every page must use one of these layouts.

Never create page-specific layouts.

\---

\# Navigation Rules


Founder navigation is fixed.

Dashboard

My Ideas

Validation Reports

Reality Sprint

Build Requests

Projects

Notifications

Settings

Never change this order.

Never remove items.

Never create alternate navigation.

\---

Admin navigation is fixed.


Dashboard

Founders

Ideas

AI Validations

Reality Sprint

Build Requests

Projects

Documents

Activity

Settings

\---

\# API Rules

Frontend communicates only through the API layer.

Never call fetch() directly inside components.

Never hardcode URLs.


Every request goes through:

services/api/

- \---

\# State Management Rules

Server state:

TanStack Query

Global UI state:

Context or Zustand

Never store server data inside Context.

\---

\# Authentication Rules

Authentication belongs to backend.

Frontend only manages:

Login


Logout

Session

Protected routes

Never store sensitive information locally.

\---

\# Design System Rules

Use design tokens.

Never use random spacing.

Never use arbitrary colors.

Never use arbitrary font sizes.

Everything should follow the design system.

\---

\# Animation Rules

Animation has purpose.

Never animate for decoration.


Animation must explain.

Animation must guide.

Animation must communicate.

\---

\# 3D Rules

3D is storytelling.

Not decoration.

Allowed:

Homepage Hero

Validate My Idea

Build My Product

Forbidden:

Founder Dashboard

Admin Dashboard


Forms

Tables

Settings

3D should never reduce usability.

- \---

\# Hero Animation Rules

Hero animation tells one story.

An idea enters Vision2Real.

Vision2Real processes it.

Validation

↓

Reality Sprint

↓

Real Product

The Vision2Real logo is the transformation engine.


Never portray Vision2Real as "just an AI."

The platform is much larger than AI.

- \---

\# Performance Rules

Target Lighthouse

Performance

95+

Accessibility

95+

SEO

95+

Best Practices

95+

Initial JS should stay lightweight.


Heavy assets load lazily.

3D loads only when needed.

\---

\# Accessibility Rules

Keyboard navigation required.

Visible focus states required.

Proper heading hierarchy required.

ARIA labels where necessary.

Never rely only on color.

Maintain sufficient contrast.

\---

\# Mobile Rules

Mobile-first.

Responsive from day one.

Never build desktop-only components.


Every component should scale.

- \---

\# AI Rules

Never fake intelligence.

Never fabricate reports.

Never fabricate market data.

Never invent research.

Never invent competitors.

Every report comes from the AI Engine.

If demo data is used,

it must clearly be marked.

- \---

\# Backend Rules

Backend owns:


Business logic

Validation

Research

Analysis

Reports

Permissions

Authentication

Database

Frontend owns:

Presentation

Interaction

Navigation

Animations

User feedback

Nothing more.


- \---

\# Code Quality Rules

Readable code over clever code.

Small components.

Small functions.

Meaningful names.

No unnecessary abstraction.

Remove dead code.

Avoid duplication.

\---

\# Git Rules

One feature per branch.

Meaningful commit messages.

Small pull requests.


No direct commits to production.

- \---

\# Documentation Rules

Every major architectural decision goes into:

docs/DECISION_LOG.md

Every completed sprint updates:

docs/IMPLEMENTATION_LOG.md

- \---

\# Build Order

Sprint 0

Foundation

↓

Sprint 1

Landing Website

↓


Sprint 2

Authentication

↓

Sprint 3

Founder Workspace

↓

Sprint 4

AI Validation

↓

Sprint 5

Reality Sprint

↓

Sprint 6

Build Requests


↓

Sprint 7

Projects

↓

Sprint 8

Admin Portal

↓

Sprint 9

Optimization

↓

Production

\---

\# Before Every Pull Request

Confirm:

Uses reusable components


Uses design system

Uses API layer

Responsive

Accessible

No duplicated logic

No hardcoded values

Matches Design Audit

Matches Build Rules

- \---

\# Non-Negotiable Principles

Trust over hype.

Clarity over complexity.

Consistency over creativity.

Evidence over assumptions.


Performance over unnecessary effects.

Maintainability over shortcuts.

User value over developer convenience.

- \---

\# Final Rule

Whenever there is uncertainty,

build the solution that makes Vision2Real feel like a premium product used by serious founders building real companies.

Everything else is secondary.


Engineering Workflow Rules
Production Development
Never use mock data unless explicitly requested.
Every production feature must integrate with the real backend.
Placeholder implementations are only allowed for explicitly planned future versions (e.g. V2 multi-agent features) and must fail gracefully.
Backward Compatibility
Never modify or remove working functionality unless explicitly requested.
Preserve existing API contracts.
New functionality must be additive.
Existing frontend behavior must not regress.
Database Migration Rules
Never modify an Alembic migration that has already been applied.
Every database schema change must be implemented through a new forward-only Alembic migration.
Never generate migrations containing runtime checks such as:
if table exists
if column exists
if index exists
Never silently skip schema changes.
Use explicit Alembic operations (op.create_table, op.add_column, op.create_index, etc.).
Before marking a backend feature complete, verify that the SQLAlchemy models and the database schema are synchronized.
Verification Rules

Every backend feature is only considered complete after verifying:

Backend starts successfully.
Database migrations apply successfully.
ORM matches database schema.
Existing APIs still function.
Frontend integration works end-to-end.
No regressions in existing features.
V1 / V2 Compatibility
V1 features may expose extension points for future V2 functionality.
V2 sections must remain hidden when data is unavailable.
Never break V1 behavior while preparing for future versions.