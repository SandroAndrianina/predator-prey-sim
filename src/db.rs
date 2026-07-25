use rusqlite::{Connection, Result};
use crate::simulation::config::SimulationConfig;

pub fn init_db() -> Result<Connection> {
    let conn = Connection::open("simulation.db")?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            prey_reproduction_rate REAL NOT NULL,
            capture_radius REAL NOT NULL,
            energy_gain REAL NOT NULL,
            energy_loss REAL NOT NULL,
            predator_reproduction_threshold REAL NOT NULL,
            initial_prey INTEGER NOT NULL,
            initial_predators INTEGER NOT NULL,
            ticks_per_cycle INTEGER NOT NULL,
            max_agents INTEGER NOT NULL,
            tick_interval REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    Ok(conn)
}

pub fn save_config(conn: &Connection, config: &SimulationConfig) -> Result<i64> {
    conn.execute(
        "INSERT INTO configs (
            name, prey_reproduction_rate, capture_radius, energy_gain,
            energy_loss, predator_reproduction_threshold, initial_prey,
            initial_predators, ticks_per_cycle, max_agents, tick_interval
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        (
            &config.name,
            &config.prey_reproduction_rate,
            &config.capture_radius,
            &config.energy_gain,
            &config.energy_loss,
            &config.predator_reproduction_threshold,
            &config.initial_prey,
            &config.initial_predators,
            &config.ticks_per_cycle,
            &config.max_agents,
            &config.tick_interval,
        ),
    )?;
    
    Ok(conn.last_insert_rowid())
}

pub fn load_all_configs(conn: &Connection) -> Result<Vec<SimulationConfig>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, prey_reproduction_rate, capture_radius, energy_gain,
         energy_loss, predator_reproduction_threshold, initial_prey,
         initial_predators, ticks_per_cycle, max_agents, tick_interval
         FROM configs ORDER BY id"
    )?;
    
    let configs = stmt.query_map([], |row| {
        Ok(SimulationConfig {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            prey_reproduction_rate: row.get(2)?,
            capture_radius: row.get(3)?,
            energy_gain: row.get(4)?,
            energy_loss: row.get(5)?,
            predator_reproduction_threshold: row.get(6)?,
            initial_prey: row.get(7)?,
            initial_predators: row.get(8)?,
            ticks_per_cycle: row.get(9)?,
            max_agents: row.get(10)?,
            tick_interval: row.get(11)?,
        })
    })?;
    
    let mut result = Vec::new();
    for config in configs {
        result.push(config?);
    }
    Ok(result)
}

pub fn load_config_by_id(conn: &Connection, id: i64) -> Result<SimulationConfig> {
    let mut stmt = conn.prepare(
        "SELECT id, name, prey_reproduction_rate, capture_radius, energy_gain,
         energy_loss, predator_reproduction_threshold, initial_prey,
         initial_predators, ticks_per_cycle, max_agents, tick_interval
         FROM configs WHERE id = ?1"
    )?;
    
    stmt.query_row([id], |row| {
        Ok(SimulationConfig {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            prey_reproduction_rate: row.get(2)?,
            capture_radius: row.get(3)?,
            energy_gain: row.get(4)?,
            energy_loss: row.get(5)?,
            predator_reproduction_threshold: row.get(6)?,
            initial_prey: row.get(7)?,
            initial_predators: row.get(8)?,
            ticks_per_cycle: row.get(9)?,
            max_agents: row.get(10)?,
            tick_interval: row.get(11)?,
        })
    })
}

pub fn delete_config(conn: &Connection, id: i64) -> Result<usize> {
    conn.execute("DELETE FROM configs WHERE id = ?1", [id])
}

pub fn seed_default_config(conn: &Connection) -> Result<()> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM configs",
        [],
        |row| row.get(0)
    )?;
    
    if count == 0 {
        let default = SimulationConfig::default();
        save_config(conn, &default)?;
        println!("✅ Configuration par défaut créée");
    }
    Ok(())
}