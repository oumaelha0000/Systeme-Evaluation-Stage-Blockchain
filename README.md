# 🎓 Blockchain Internship Evaluation System

A decentralized platform designed to streamline and secure the internship evaluation process. Built with **Solidity**, **Next.js**, and **Prisma**, this system ensures transparency, data integrity, and automated certification through NFT minting.

---

## 🚀 Overview

The **Blockchain Internship Evaluation System** automates the lifecycle of an internship, from registration to certification. It leverages blockchain technology to prevent fraud and provide students with immutable, verifiable digital certificates.

### Key Features

-   **Role-Based Access Control (RBAC)**: Distinct permissions for Admins, Companies, Supervisors, and Students.
-   **Company Whitelisting**: Admin-controlled KYB (Know Your Business) process to ensure only legitimate partners participate.
-   **Decentralized Storage**: Internship reports are referenced via IPFS hashes on-chain.
-   **Automated Certification**: Secure, automatic minting of ERC-721 NFT certificates upon successful completion and grading.
-   **Off-chain Synchronization**: Seamless integration between the blockchain state and a Prisma-managed database for enhanced performance and UI responsiveness.

---

## 🛠 Tech Stack

-   **Smart Contracts**: Solidity ^0.8.24, Hardhat, OpenZeppelin (ERC721, AccessControl, Pausable).
-   **Frontend**: Next.js 15+, React 19, Tailwind CSS 4, Ethers.js v6.
-   **Backend/Database**: Prisma ORM, PostgreSQL.
-   **Icons & UI**: Lucide React, Framer Motion (animations).

---

## 🏗 Architecture

### Smart Contract (`InternshipSystem.sol`)
-   **`createInternship`**: Admin links a student, company, and supervisor.
-   **`validateInternshipByCompany`**: Company confirms the student's presence and performance.
-   **`submitReport`**: Student uploads their report hash.
-   **`validateReport` & `assignGrade`**: Supervisor reviews the report and assigns a grade.
-   **`_checkAndMintCertificate`**: Internal logic that mints the NFT once all conditions are met.

### Frontend Flow
-   **Dashboard**: Dynamic views based on the connected user's role.
-   **Connect Wallet**: Seamless MetaMask integration via Ethers.js.
-   **Admin Panel**: Manage whitelisting and internship creation.

---

## 🚦 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18+)
-   [MetaMask](https://metamask.io/) browser extension
-   [Hardhat](https://hardhat.org/) for local blockchain simulation

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/oumaelha0000/Systeme-Evaluation-Stage-Blockchain.git
    cd Systeme-Evaluation-Stage-Blockchain
    ```

2.  **Install base dependencies**:
    ```bash
    npm install
    ```

3.  **Install frontend dependencies**:
    ```bash
    cd frontend
    npm install
    cd ..
    ```

### Running Locally

1.  **Start a local Hardhat node**:
    ```bash
    npx hardhat node
    ```

2.  **Deploy & Seed Contracts**:
    Open a new terminal and run:
    ```bash
    node bulletproof_deploy.js
    ```

3.  **Setup Database (Prisma)**:
    ```bash
    cd frontend
    npx prisma migrate dev --name init
    npx prisma db seed
    ```

4.  **Start the Frontend**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements.

---

**Developed with ❤️ for the Blockchain Community.**
