use rand::Rng;

#[derive(Debug)]
enum Species {
    Prey,
    Predator,
}

#[derive(Debug)]
struct Agent {
    x: f64,
    y: f64,
    energy: f64,
    species: Species,
}

impl Agent{
        fn move_randomly(&mut self) {
            self.x += get_random();
            self.y += get_random();
    }
}

fn get_random() -> f64 {
    let mut rng = rand::thread_rng();
    rng.gen_range(-1.0..1.0)
}

fn main() {
    let population = vec![
        Agent { x: 10.0, y: 5.0, energy: 20.0, species: Species::Prey },
        Agent { x: 3.0, y: 8.0, energy: 15.0, species: Species::Predator },
    ];

    for agent in &population {
        println!("{:?}", agent);
    }
}