// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Freelance Escrow - standalone, ready for Remix IDE (Solidity 0.8.24).
/// @notice Educational ETH escrow. The immutable administrator arbitrates disputes.
contract FreelanceEscrow {
    enum Status { Created, Funded, Submitted, Disputed, Released, Refunded, Cancelled }
    struct Job {
        uint256 id;
        address employer;
        address freelancer;
        string title;
        string description;
        uint256 amount;
        uint256 deadline;
        Status status;
        string evidence;
        string disputeReason;
    }
    address public immutable administrator;
    uint256 public jobCount;
    uint256 public totalEscrow;
    mapping(uint256 => Job) private jobs;
    bool private entered;

    event Activity(uint256 indexed jobId, address indexed actor, string action, string details, uint256 amount);

    constructor() { administrator = msg.sender; }
    modifier nonReentrant() {
        require(!entered, "Reentrant call");
        entered = true;
        _;
        entered = false;
    }
    modifier exists(uint256 id) { require(id > 0 && id <= jobCount, "Job not found"); _; }

    function createJob(string calldata title, string calldata description, address freelancer,
        uint256 amount, uint256 deadline) external returns (uint256 id) {
        require(bytes(title).length > 0 && bytes(title).length <= 240, "Invalid title");
        require(bytes(description).length > 0 && bytes(description).length <= 6000, "Invalid description");
        require(freelancer != address(0) && freelancer != msg.sender, "Invalid freelancer");
        require(amount > 0, "Invalid amount");
        require(deadline > block.timestamp, "Deadline must be future");
        id = ++jobCount;
        jobs[id] = Job(id, msg.sender, freelancer, title, description, amount, deadline, Status.Created, "", "");
        emit Activity(id, msg.sender, "CREATE", title, amount);
    }
    function deposit(uint256 id) external payable exists(id) {
        Job storage job = jobs[id];
        require(msg.sender == job.employer, "Employer only");
        require(job.status == Status.Created, "Invalid status");
        require(msg.value == job.amount, "Exact payment required");
        job.status = Status.Funded;
        totalEscrow += msg.value;
        emit Activity(id, msg.sender, "DEPOSIT", "Escrow funded", msg.value);
    }
    function submitWork(uint256 id, string calldata evidence) external exists(id) {
        Job storage job = jobs[id];
        require(msg.sender == job.freelancer, "Freelancer only");
        require(job.status == Status.Funded || job.status == Status.Submitted, "Invalid status");
        require(bytes(evidence).length > 0 && bytes(evidence).length <= 2000, "Invalid evidence");
        job.evidence = evidence;
        job.status = Status.Submitted;
        emit Activity(id, msg.sender, "SUBMIT", evidence, 0);
    }
    function approve(uint256 id) external nonReentrant exists(id) {
        Job storage job = jobs[id];
        require(msg.sender == job.employer, "Employer only");
        require(job.status == Status.Submitted, "Invalid status");
        _settle(job, true);
        emit Activity(id, msg.sender, "RELEASE", "Work approved", job.amount);
    }
    function openDispute(uint256 id, string calldata reason) external exists(id) {
        Job storage job = jobs[id];
        require(msg.sender == job.employer || msg.sender == job.freelancer, "Party only");
        require(job.status == Status.Funded || job.status == Status.Submitted, "Invalid status");
        require(bytes(reason).length > 0 && bytes(reason).length <= 2000, "Invalid reason");
        job.disputeReason = reason;
        job.status = Status.Disputed;
        emit Activity(id, msg.sender, "DISPUTE", reason, 0);
    }
    function resolveDispute(uint256 id, bool payFreelancer, string calldata decision) external nonReentrant exists(id) {
        require(msg.sender == administrator, "Administrator only");
        Job storage job = jobs[id];
        require(job.status == Status.Disputed, "Invalid status");
        require(bytes(decision).length > 0 && bytes(decision).length <= 2000, "Invalid decision");
        _settle(job, payFreelancer);
        emit Activity(id, msg.sender, payFreelancer ? "RESOLVE_PAY" : "RESOLVE_REFUND", decision, job.amount);
    }
    /// @notice Extra convenience: cancellation is possible only before any ETH is deposited.
    function cancelJob(uint256 id) external exists(id) {
        Job storage job = jobs[id];
        require(msg.sender == job.employer, "Employer only");
        require(job.status == Status.Created, "Invalid status");
        job.status = Status.Cancelled;
        emit Activity(id, msg.sender, "CANCEL", "Cancelled before funding", 0);
    }
    function getJob(uint256 id) external view exists(id) returns (Job memory) { return jobs[id]; }
    function _settle(Job storage job, bool payFreelancer) private {
        job.status = payFreelancer ? Status.Released : Status.Refunded;
        totalEscrow -= job.amount;
        address recipient = payFreelancer ? job.freelancer : job.employer;
        (bool success, ) = payable(recipient).call{value: job.amount}("");
        require(success, "ETH transfer failed");
    }
}
