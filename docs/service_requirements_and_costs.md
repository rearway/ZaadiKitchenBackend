# Zaadi Kitchen — Services, Access & Pricing Guide

This document outlines the third-party services required to run the Zaadi Kitchen platform, the access permissions the client must provide, and the estimated costs based on specific scale requirements.

## 🚀 Scale & Capacity Assumptions
The pricing below is estimated based on the following target:
*   **User Base:** Up to **5,000 active subscribers**.
*   **Concurrent Traffic:** **Low** (Realistically 50-100 concurrent users during peak hours).
*   **Target Region:** Middle East (Bahrain `me-south-1` or UAE `me-central-1`).

---

## 1. Cloud Infrastructure: AWS (Amazon Web Services)
We present two options for the backend infrastructure depending on the client's preference for cost vs. scalability.

### Option A: Basic / Minimum Infra (EC2-based)
Ideal for the initial launch phase to keep costs at the absolute minimum.
*   **Compute:** Single EC2 Instance (`t3.small`).
*   **Scaling:** Manual. Increasing capacity requires manually upgrading the instance or adding others.
*   **Pros:** Lowest direct cost.
*   **Cons:** Manual maintenance (security patches, OS updates), higher risk of downtime during upgrades.

### Option B: Scalable / Modern Infra (ECS Fargate) — *Recommended*
Ideal for long-term growth and ease of management.
*   **Compute:** AWS ECS Fargate (Serverless Containers).
*   **Scaling:** Automatic. The system automatically adds/removes containers based on traffic.
*   **Pros:** Zero server management, built-in high availability, easier deployments (Docker), seamless scaling as you grow beyond 5k users.
*   **Cons:** Slightly higher base cost compared to a single small EC2.

### 💰 Monthly Cost Comparison (Estimated)

| Service | EC2 (Minimum) | ECS Fargate (Scalable) | Notes |
| :--- | :--- | :--- | :--- |
| **Compute** | ~$15 | ~$40 | 1x `t3.small` vs 2x Fargate Tasks |
| **Database (RDS)** | ~$35 | ~$75 | Single-AZ vs Multi-AZ (Reliability) |
| **Caching (Redis)** | $0 (Local) | ~$15 | `cache.t3.micro` for session/speed |
| **Storage (S3)** | ~$2 | ~$2 | Image & Document storage (50GB) |
| **Security (WAF)** | Optional | ~$10 | Web Application Firewall (Protection) |
| **Networking** | ~$1 | ~$1 | Route 53 (DNS Management) |
| **Frontend** | ~$5 | ~$5 | AWS Amplify (High-speed App hosting) |
| **CDN & DNS** | Free Tier | Free Tier | CloudFront (1TB Free) |
| **Total (Monthly)** | **~$58 – $75** | **~$148 – $180** | *Excludes data transfer costs* |

---

## 2. Detailed AWS Service Breakdown

### 📱 Frontend: AWS Amplify
*   **Purpose:** Static deployment and hosting for the web dashboard.
*   **Benefit:** High-speed delivery, automatic CI/CD from Git.
*   **Approx. Cost:** ~$5–$10/month (based on build minutes and data served).

### ⚡ Messaging: Amazon SNS
*   **Purpose:** Sending push notifications to mobile devices.
*   **Benefit:** Highly reliable, integrates with Firebase for Android/iOS.
*   **Approx. Cost:** **FREE** (First 1 million notifications per month).

### 🖼️ Storage & CDN: Amazon S3 + CloudFront
*   **Purpose:** S3 stores user photos, menu images, etc. CloudFront delivers them via high-speed global edge locations.
*   **Approx. Cost:** Practically free for the start (~$2-5/month total).

### 🛡️ Security & DNS: WAF + Route 53
*   **WAF:** Protects the API from common web exploits (SQL injection, bot attacks).
*   **Route 53:** Manages the domain name (e.g., `api.zaadikitchen.com`).
*   **Approx. Cost:** ~$11/month.

### 🕒 Schedulers: EventBridge
*   **Purpose:** Used for recurring tasks like generating daily menus or processing midnight subscriptions.
*   **Approx. Cost:** **FREE** (Standard usage).

---

## 3. Payments: Selecting the Right Gateway
For processing customer subscription payments (Apple Pay, Card, KNET, Mada, Benefit). We recommend selecting a gateway that supports **Recurring Billing** out-of-the-box.

### 💰 Payment Gateway Comparison

| Feature | **Moyasar** | **Tap Payments** | **Telr** |
| :--- | :--- | :--- | :--- |
| **Best For** | Saudi Arabia (KSA) Focus | Multi-GCC Growth (UAE, KSA, BH) | UAE Startups & SMEs |
| **Local Methods** | Mada, STC Pay, Apple Pay | Mada, **Benefit (BH)**, KNET, Apple Pay | Mada, Apple Pay, Cards |
| **Subscriptions** | Supports Tokenization | Dedicated "Subscription" engine | Basic Recurring Billing |
| **Setup Fee** | Usually $0 | $0 (Varies by volume) | Tiered (e.g., $35/mo) |
| **Transaction Fee** | ~2.2% to 2.5% + 1 SAR | ~2.75% + fixed fee | ~2.85% (Entry Tier) |
| **Onboarding** | 3-5 Business Days | 5-10 Business Days | 5-7 Business Days |

### Overview & Recommendations

*   **Moyasar (Option A):** Excellent choice if the primary target is the Saudi market. It is highly optimized for **Mada** and has a very clean developer experience for token-based recurring payments.
*   **Tap Payments (Option B) — *Recommended for GCC Growth*:** Since Zaadi Kitchen targets multiple regions, Tap is the strongest contender. It is the only one with native support for **Benefit (Bahrain)**, **KNET (Kuwait)**, and **Mada (KSA)** under a single integration. Their "GoSell" and "Subscription" APIs are built specifically for recurring business models.
*   **Telr (Option C):** A solid, well-established provider in the UAE. Good if you want structured monthly plans with lower transaction percentages as you scale, but less "modern" API-wise compared to Tap or Moyasar.

---

## 4. Communication: WhatsApp & OTP (KSA Focus)
For sending login codes (OTP) and automated delivery alerts. For the Saudi market, we recommend a **local or regional provider** to ensure CITC compliance and stable OTP delivery.

### 💬 Communication Provider Comparison

| Feature | **Unifonic** | **Bird (MessageBird)** | **Twilio** |
| :--- | :--- | :--- | :--- |
| **Best For** | **Saudi Market (Local)** | Global High-Volume | Global Developer Tools |
| **KSA Compliance** | Native (CITC Compliant) | Manual Configuration | Manual Configuration |
| **WhatsApp OTP** | Integrated Workflow | AI-driven Routing | Standard API |
| **SMS Delivery** | Local Routes (Highest) | Global Routes (Medium) | Global Routes (Medium) |
| **Pricing (SMS)** | ~$0.04 - $0.05 / SMS | ~$0.05 - $0.07 / SMS | ~$0.06 - $0.08 / SMS |
| **WhatsApp Markup** | Competitive Base | Volume-based | $0.005 per message |

### Overview & Recommendations

*   **Unifonic (Option A) — *Recommended for KSA*:** As a Saudi-based provider, they offer the best reliability for OTPs across STC, Mobily, and Zain. They handle the **Sender ID registration** (required by CITC) much more seamlessly than global providers.
*   **Bird (Option B - Formerly MessageBird):** A strong alternative if you are looking for a global provider but want better pricing than Twilio. Bird often provides more competitive rates for high-volume GCC traffic.
*   **Twilio (Option C):** While excellent for developer experience, Twilio is often the most expensive option for the Saudi market due to higher per-message markups and complex compliance requirements for the region.

> [!TIP]
> **Cost Saving:** For WhatsApp, always use the **"Authentication"** conversation category for OTPs. Meta charges a lower rate for this category compared to "Marketing" or "Utility" messages.

---

## 6. Implementation Timeline
To avoid development delays, each service must be set up according to the following schedule:

| Timeline | Milestone / Requirement | Priority |
| :--- | :--- | :--- |
| **Week 0 (Pre-Start)** | **Domain Registration & AWS Account Creation** | 🔴 Critical |
| **Week 2 (Dev Start)** | **Payment Gateway & WhatsApp API Applications** | 🔴 Critical |
| **Week 3** | **Apple & Google Developer Accounts** (For App Stores) | 🟠 High |
| **Week 4** | **Meta Business Verification** (For WhatsApp Live) | 🟠 High |
| **Week 6** | **Payment Merchant Account Verification** | 🟠 High |

### Critical Dependencies Explained

1.  **Phase 0 (AWS & Domain):** We cannot set up the backend environment, databases, or secure APIs (HTTPS) without these. They must be ready before the project kicks off.
2.  **App Store Accounts (Apple/Google):** Verification can sometimes take 1-2 weeks. We need these early to set up Apple Pay and Push Notifications correctly.
3.  **Meta & Payment Verifications:** Both WhatsApp (Meta) and Payment Gateways (Tap/Moyasar) require business license verification. This overhead should be cleared by Week 2 of development so we can run end-to-end integration tests.

---

### 💡 Summary Checklist for Client
1.  [ ] **Domain Name:** Purchase via Namecheap (Crucial for HTTPS/APIs).
2.  [ ] **AWS Account:** Create at [aws.amazon.com] (Identity verified & card added).
3.  [ ] **Payment Merchant Account:** Register with Telr or Tap.
4.  [ ] **Meta Business Verification:** Required for WhatsApp API approval.
5.  [ ] **Apple/Google Developer Accounts:** Register as an Organization.
6.  [ ] **Sentry Account:** Create at [sentry.io] for error tracking.
