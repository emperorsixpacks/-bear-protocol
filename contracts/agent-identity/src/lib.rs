#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, Address, Env, String};

/// A registered agent in the MARC agent-identity registry.
#[derive(Clone)]
#[contracttype]
pub struct Agent {
    pub id: u64,
    pub owner: Address,
    pub uri: String,
}

#[contracttype]
enum DataKey {
    NextId,
    Agent(u64),
    OwnerToId(Address),
}

// --- Events ---

/// Emitted when a new agent is registered.
#[contractevent]
pub struct Registered {
    #[topic]
    pub owner: Address,
    pub agent_id: u64,
}

#[contract]
pub struct AgentIdentityContract;

#[contractimpl]
impl AgentIdentityContract {
    /// Register a new agent owned by `owner`. Caller must sign for `owner`.
    /// Returns the newly-assigned sequential agent id (starts at 1).
    pub fn register(env: Env, owner: Address, uri: String) -> u64 {
        owner.require_auth();

        if env
            .storage()
            .persistent()
            .has(&DataKey::OwnerToId(owner.clone()))
        {
            panic!("owner already registered");
        }

        let next: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(1u64);

        let agent = Agent {
            id: next,
            owner: owner.clone(),
            uri,
        };
        env.storage().persistent().set(&DataKey::Agent(next), &agent);
        env.storage()
            .persistent()
            .set(&DataKey::OwnerToId(owner.clone()), &next);
        env.storage().instance().set(&DataKey::NextId, &(next + 1));

        Registered {
            owner,
            agent_id: next,
        }
        .publish(&env);

        next
    }

    /// Fetch an agent by id.
    pub fn get_agent(env: Env, id: u64) -> Option<Agent> {
        env.storage().persistent().get(&DataKey::Agent(id))
    }

    /// Look up the agent id owned by `owner`, if any.
    pub fn agent_of(env: Env, owner: Address) -> Option<u64> {
        env.storage().persistent().get(&DataKey::OwnerToId(owner))
    }

    /// Contract version. Bump on ABI changes.
    pub fn version(_env: Env) -> u32 {
        1
    }
}

#[cfg(test)]
mod test;
