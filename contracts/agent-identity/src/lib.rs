#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct AgentIdentityContract;

#[contractimpl]
impl AgentIdentityContract {
    /// Stub so the contract has at least one entry point for the macro.
    /// Real entry points land in Task 1.2.
    pub fn version(_env: Env) -> u32 {
        1
    }
}

#[cfg(test)]
mod test;
