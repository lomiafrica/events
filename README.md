# Djaouli Ent.

A comprehensive website for Djaouli Entertainment, a Côte d'Ivoire based company specializing in event organization and related services. This website combines e-commerce functionality for selling event tickets with a content-rich blog and more.

## Overview

This project is built with:

- **Next.js**: Frontend framework with App Router
- **Sanity CMS**: Content management for all aspects including e-commerce
- **Tailwind CSS**: For styling
- **shadcn/ui**: Component library
- **Resend**: Programmatic emails

The website features:

- Event listings with flyers as clickable items
- Ticket and bundle sales for events
- Blog section with articles
- Company story page
- Fully responsive design optimized for mobile

## E-commerce with Sanity

Unlike traditional e-commerce platforms, this project uses Sanity to manage all e-commerce aspects:

- **Events**: Stored as Sanity documents with details like date, location, and description
- **Tickets**: Configured as arrays within event documents, including pricing and availability
- **Bundles**: Special ticket packages with included items and pricing
- **Inventory**: Ticket availability managed through Sanity

This approach provides several benefits:

- Complete content flexibility
- Unified content management
- Custom ticket types and bundles for each event
- Real-time inventory updates

## Payment Gateway Integration

The project is designed to integrate with lomi., a payment service provider based in Côte d'Ivoire while keeping product data in Sanity:

1. **Product data** (events, tickets, bundles) is stored and managed in Sanity
2. **Cart functionality** is implemented in the frontend
3. **Checkout process** connects to a lomi.'s API.
4. **Order confirmation** updates inventory in Sanity via API

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- bun
- Sanity account
- Resend account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/princemuichkine/djaouli-ent.git
   cd djaouli-ent
   bun install
   bun run dev
   ```
