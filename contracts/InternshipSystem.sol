// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract InternshipSystem is ERC721URIStorage, AccessControl, Pausable {
    bytes32 public constant COMPANY_ROLE = keccak256("COMPANY_ROLE");
    bytes32 public constant SUPERVISOR_ROLE = keccak256("SUPERVISOR_ROLE");
    
    uint256 private _nextInternshipId = 1;

    struct Internship {
        address student;
        address company;
        address supervisor;
        bool companyValidated;
        bool reportValidated;
        bool isGraded;
        uint8 grade;
        string reportIPFSHash;
    }

    mapping(uint256 => Internship) private internships; // PRIVATE for data protection
    mapping(address => uint256) public studentToInternship;
    mapping(address => bool) public whitelistedCompanies; // KYB Requirements

    event CompanyWhitelisted(address indexed company);
    event InternshipCreated(uint256 indexed internshipId, address indexed student, address indexed company, address supervisor);
    event CompanyValidated(uint256 indexed internshipId, address indexed company);
    event ReportSubmitted(uint256 indexed internshipId, string ipfsHash);
    event ReportValidated(uint256 indexed internshipId, address indexed supervisor);
    event GradeAssigned(uint256 indexed internshipId, uint8 grade, address indexed supervisor);
    event CertificateMinted(address indexed student, uint256 indexed tokenId);

    constructor() ERC721("Internship Certificate", "INTCERT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // --- ADMIN EMERGENCY FUNCTIONS ---
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // --- ADMIN FUNCTIONS ---
    function whitelistCompany(address company) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        require(!whitelistedCompanies[company], "Company already whitelisted");
        whitelistedCompanies[company] = true;
        emit CompanyWhitelisted(company);
    }

    function createInternship(address student, address company, address supervisor) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        require(studentToInternship[student] == 0, "Student already has an internship");
        require(whitelistedCompanies[company], "Company is not whitelisted by Admin");
        
        uint256 internshipId = _nextInternshipId++;
        
        internships[internshipId] = Internship({
            student: student,
            company: company,
            supervisor: supervisor,
            companyValidated: false,
            reportValidated: false,
            isGraded: false,
            grade: 0,
            reportIPFSHash: ""
        });
        
        studentToInternship[student] = internshipId;
        
        emit InternshipCreated(internshipId, student, company, supervisor);
    }

    // --- ACTION FUNCTIONS ---
    function validateInternshipByCompany(uint256 internshipId) external onlyRole(COMPANY_ROLE) whenNotPaused {
        Internship storage internship = internships[internshipId];
        require(internship.company == msg.sender, "Not the designated company");
        require(!internship.companyValidated, "Already validated");
        
        internship.companyValidated = true;
        emit CompanyValidated(internshipId, msg.sender);
        
        _checkAndMintCertificate(internshipId);
    }

    function submitReport(uint256 internshipId, string memory ipfsHash) external whenNotPaused {
        Internship storage internship = internships[internshipId];
        require(internship.student == msg.sender, "Not the designated student");
        require(bytes(ipfsHash).length > 0, "Empty IPFS hash");
        require(!internship.reportValidated, "Report already validated and locked");
        
        internship.reportIPFSHash = ipfsHash;
        emit ReportSubmitted(internshipId, ipfsHash);
    }

    function validateReport(uint256 internshipId) external onlyRole(SUPERVISOR_ROLE) whenNotPaused {
        Internship storage internship = internships[internshipId];
        require(internship.supervisor == msg.sender, "Not the designated supervisor");
        require(bytes(internship.reportIPFSHash).length > 0, "Report not submitted yet");
        require(!internship.reportValidated, "Already validated");
        
        internship.reportValidated = true;
        emit ReportValidated(internshipId, msg.sender);
    }

    function assignGrade(uint256 internshipId, uint8 finalGrade) external onlyRole(SUPERVISOR_ROLE) whenNotPaused {
        Internship storage internship = internships[internshipId];
        require(internship.supervisor == msg.sender, "Not the designated supervisor");
        require(internship.reportValidated, "Report must be validated first before grading");
        require(finalGrade <= 100, "Grade must be <= 100");
        
        internship.grade = finalGrade;
        internship.isGraded = true;
        emit GradeAssigned(internshipId, finalGrade, msg.sender);
        
        _checkAndMintCertificate(internshipId);
    }

    function _checkAndMintCertificate(uint256 internshipId) internal {
        Internship memory internship = internships[internshipId];
        if (internship.companyValidated && internship.reportValidated && internship.isGraded) {
            uint256 tokenId = internshipId; 
            _safeMint(internship.student, tokenId);
            _setTokenURI(tokenId, internship.reportIPFSHash);
            
            emit CertificateMinted(internship.student, tokenId);
        }
    }

    // --- GETTERS (Privacy enforced) ---
    function getInternship(uint256 internshipId) external view returns (
        address student,
        address company,
        address supervisor,
        bool companyValidated,
        bool reportValidated,
        uint8 grade,
        string memory reportIPFSHash,
        bool isGraded
    ) {
        Internship memory internship = internships[internshipId];
        require(internship.student != address(0), "Internship does not exist");
        
        bool isAdmin = hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
        bool isStudent = internship.student == msg.sender;
        bool isSupervisor = internship.supervisor == msg.sender;
        bool isCompany = internship.company == msg.sender;
        
        require(isAdmin || isStudent || isSupervisor || isCompany, "Access denied: Not a participant");

        // Obfuscate sensitive data for the company (they don't need the grade or IPFS hash)
        if (isCompany && !isAdmin) {
            return (
                internship.student,
                internship.company,
                internship.supervisor,
                internship.companyValidated,
                internship.reportValidated,
                0,
                "",
                internship.isGraded
            );
        }

        return (
            internship.student,
            internship.company,
            internship.supervisor,
            internship.companyValidated,
            internship.reportValidated,
            internship.grade,
            internship.reportIPFSHash,
            internship.isGraded
        );
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
