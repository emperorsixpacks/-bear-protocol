#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

/// Lifecycle states for a job escrow.
#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum JobStatus {
    Open,
    Funded,
    Submitted,
    Completed,
    Rejected,
    Cancelled,
}

#[contracttype]
enum DataKey {
    NextId,
    Job(u64),
    Treasury,
    Admin,
    FeeBps,
}

const DEFAULT_FEE_BPS: u32 = 100; // 1%
#[allow(dead_code)]
const MAX_FEE_BPS: u32 = 500; // 5% hard cap (used in set_fee_bps guard, added in Task 2.6)
#[allow(dead_code)]
const BPS_DENOM: i128 = 10_000;

#[contract]
pub struct AgenticCommerceContract;

#[contractimpl]
impl AgenticCommerceContract {
    /// One-time initializer. Sets admin, treasury, default fee (1%), and job id counter.
    /// Panics if already initialized.
    pub fn init(env: Env, admin: Address, treasury: Address) {
        admin.require_auth();
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage().instance().set(&DataKey::FeeBps, &DEFAULT_FEE_BPS);
        env.storage().instance().set(&DataKey::NextId, &1u64);
    }

    /// Contract version. Bump on ABI changes.
    pub fn version(_env: Env) -> u32 {
        1
    }
}

#[cfg(test)]
mod test;
