#![cfg(test)]
use super::*;
use soroban_sdk::Env;

#[test]
fn contract_can_be_deployed() {
    let env = Env::default();
    let contract_id = env.register(AgentIdentityContract, ());
    let client = AgentIdentityContractClient::new(&env, &contract_id);
    assert_eq!(client.version(), 1);
}
