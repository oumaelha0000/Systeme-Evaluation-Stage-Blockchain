const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InternshipSystem", function () {
  let InternshipSystem;
  let internshipSystem;
  let admin;
  let company;
  let supervisor;
  let student;
  let unauthorized;
  
  let COMPANY_ROLE;
  let SUPERVISOR_ROLE;

  beforeEach(async function () {
    [admin, company, supervisor, student, unauthorized] = await ethers.getSigners();

    InternshipSystem = await ethers.getContractFactory("InternshipSystem");
    internshipSystem = await InternshipSystem.deploy();
    
    COMPANY_ROLE = await internshipSystem.COMPANY_ROLE();
    SUPERVISOR_ROLE = await internshipSystem.SUPERVISOR_ROLE();

    // Setup roles
    await internshipSystem.grantRole(COMPANY_ROLE, company.address);
    await internshipSystem.grantRole(SUPERVISOR_ROLE, supervisor.address);
  });

  describe("Deployment", function () {
    it("Should set the right roles", async function () {
      expect(await internshipSystem.hasRole(COMPANY_ROLE, company.address)).to.be.true;
      expect(await internshipSystem.hasRole(SUPERVISOR_ROLE, supervisor.address)).to.be.true;
    });
  });

  describe("Internship Flow", function () {
    const ipfsHash = "QmTestHash123456789";

    beforeEach(async function () {
      await internshipSystem.createInternship(student.address, company.address, supervisor.address);
    });

    it("Should allow the correct company to validate", async function () {
      await expect(internshipSystem.connect(company).validateInternshipByCompany(1))
        .to.emit(internshipSystem, "CompanyValidated")
        .withArgs(1);
    });

    it("Should revert if unauthorized company tries to validate", async function () {
      await expect(internshipSystem.connect(unauthorized).validateInternshipByCompany(1))
        .to.be.revertedWithCustomError(internshipSystem, "AccessControlUnauthorizedAccount")
        .withArgs(unauthorized.address, COMPANY_ROLE);
    });

    it("Should allow the student to submit a report", async function () {
      await expect(internshipSystem.connect(student).submitReport(1, ipfsHash))
        .to.emit(internshipSystem, "ReportSubmitted")
        .withArgs(1, ipfsHash);
    });

    it("Should allow the correct supervisor to validate the report", async function () {
      await internshipSystem.connect(student).submitReport(1, ipfsHash);
      
      await expect(internshipSystem.connect(supervisor).validateReport(1))
        .to.emit(internshipSystem, "ReportValidated")
        .withArgs(1);
    });

    it("Should mint an NFT when both validations are complete", async function () {
      await internshipSystem.connect(student).submitReport(1, ipfsHash);
      await internshipSystem.connect(company).validateInternshipByCompany(1);
      
      await expect(internshipSystem.connect(supervisor).validateReport(1))
        .to.emit(internshipSystem, "CertificateMinted")
        .withArgs(student.address, 1);
        
      expect(await internshipSystem.ownerOf(1)).to.equal(student.address);
      expect(await internshipSystem.tokenURI(1)).to.equal(ipfsHash);
    });
    
    it("Should allow the supervisor to assign a grade", async function () {
      await expect(internshipSystem.connect(supervisor).assignGrade(1, 95))
        .to.emit(internshipSystem, "GradeAssigned")
        .withArgs(1, 95);
        
      const internship = await internshipSystem.internships(1);
      expect(internship.grade).to.equal(95);
    });
  });
});
