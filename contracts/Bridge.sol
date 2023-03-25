 //SPDX-License-Identifier: Unlicense

//  * * * * * * * * * * * * * * * * * * * * * * *
//  *      / __ )/ __ \/  _/ __ \/ ____/ ____/  *
//  *     / __  / /_/ // // / / / / __/ __/     *
//  *    / /_/ / _, _// // /_/ / /_/ / /___     *
//  *   /_____/_/ |_/___/_____/\____/_____/     *
//  * * * * * * * * * * * * * * * * * * * * * * *
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

error OnlyControllers();
error ZeroBalance();
error TransferFailed();
error NotSameLength();

/**
 * @title Bridge contract
 * @author maxper
 */                                                  
contract Bridge is Ownable, Pausable {

    uint256 public fee = 100;                           // fee / 10 
    uint256 public accumulatedFees = 0;                 // total fees spent by bridgers

    IERC20 private token;                               //ERC20 bridged token

    struct Deposit {
        address depositor;
        uint256 amount;
    }

    uint256 public nonceThisChain = 0;                  //count of deposits stored in the blockchain
    Deposit[] public depositsHistory;                   //previous deposits

    mapping(address => bool) private controllers;       //whitelist of allowed controllers

    mapping(address => uint256) public claimableTokens; //amount deposited by address

    uint256 public nonceOtherChain;                     //count of deposits stored in the other blockchain

    event OnDeposit(address depositor, uint256 amount);
    event OnWithdraw(address depositor, uint256 amount);

    modifier onlyControllers() {
        if(!controllers[msg.sender])
            revert OnlyControllers();
        _;
    }

    constructor(address tokenAddress) Ownable() Pausable() {
        token = IERC20(tokenAddress);
        controllers[msg.sender] = true;
    }

    function addController(address controller) external onlyOwner {
        if(controllers[controller]){
            revert OnlyControllers();
        }

        controllers[controller] = true;
    }

    function removeController(address controller) external onlyOwner {
        if(!controllers[controller]){
            revert OnlyControllers();
        }

        controllers[controller] = false;
    }

    function setPause(bool state) external onlyOwner {
        if(state)
            _pause();
        else
            _unpause();
    }

    function setFee(uint256 newFee) external onlyOwner {
        fee = newFee;
    }

    function setToken(address tokenAddress) external onlyOwner {
        token = IERC20(tokenAddress);
    }

     /**
     * @notice Allows owners to recover NFT sent to the contract by mistake
     * @param _token: NFT token address
     * @param _tokenId: tokenId
     * @dev Callable by owner
     */
    function recoverNonFungibleToken(address _token, uint256 _tokenId) external onlyOwner {
        IERC721(_token).transferFrom(address(this), address(msg.sender), _tokenId);
    }

    /**
     * @notice Allows owners to recover tokens sent to the contract by mistake
     * @param _token: token address
     * @dev Callable by owner
     */
    function recoverToken(address _token) external onlyOwner {
        if(_token == address(token)) {
            if(accumulatedFees == 0)
                revert ZeroBalance();

            uint256 toTransfer = accumulatedFees;
            accumulatedFees = 0;
            IERC20(_token).transferFrom(address(this), address(msg.sender), toTransfer);
        }
        else {
            uint256 balance = IERC20(_token).balanceOf(address(this));
            if(balance == 0)
                revert ZeroBalance();

            IERC20(_token).transferFrom(address(this), address(msg.sender), balance);
        }
    }

    //withdraw token to bridger after depositing on the other chain 
    function withdraw() external whenNotPaused {
        uint256 amount = claimableTokens[msg.sender];
        if(amount == 0)
            revert ZeroBalance();

        claimableTokens[msg.sender] = 0;

        token.transfer(msg.sender, amount);

        emit OnWithdraw(msg.sender, amount);
    }

    //allow bridgers to deposit in order to withdraw on the other chain
    function deposit(uint256 amount) external whenNotPaused {
        if(amount == 0)
            revert ZeroBalance();
        
        uint256 balanceBefore = token.balanceOf(address(this));
        
        bool success = token.transferFrom(msg.sender, address(this), amount);
        if(!success)
            revert TransferFailed();

        amount = token.balanceOf(address(this)) - balanceBefore;

        uint256 amountFee = amount * fee / 10000;
        uint256 amountDeposited = amount - amountFee;
        depositsHistory.push(Deposit ({
            depositor: msg.sender, amount: amountDeposited
        }));
        ++nonceThisChain;

        accumulatedFees += amountFee;

        emit OnDeposit(msg.sender, amountDeposited);
    }

    //get previous deposits since a starting point, used by bot to write it on the info contract in the other chain
    function getDepositsSinceStartingNonce(uint256 startNonce) public view returns (address[] memory depositors, uint256[] memory amount) {
        depositors = new address[](nonceThisChain - startNonce);
        amount = new uint256[](nonceThisChain - startNonce);

        for(uint i = startNonce; i < nonceThisChain; ) {
            depositors[i - startNonce] = depositsHistory[i].depositor;
            amount[i - startNonce] = depositsHistory[i].amount;

            unchecked {
                ++i;
            }
        }
    }

    //deposit function called by bot, accounting multiples transfer at once with arrays.
    function updateDeposits(address[] memory depositor, uint256[] memory amount) external onlyControllers {
        if(depositor.length != amount.length)
            revert NotSameLength();

        for(uint i = 0; i < depositor.length;){
            claimableTokens[depositor[i]] += amount[i];

            unchecked {
                ++i;
            }
        }
        
        nonceOtherChain += depositor.length;
    }
}
