use axum::Router;
use openpacketloss_server as lib;
use std::{collections::HashMap, sync::Arc, time::SystemTime};
use tokio::sync::RwLock;
use tracing::{error, info, warn};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    if std::path::Path::new(".env").is_file() {
        if let Err(error) = dotenvy::dotenv() {
            warn!(%error, "could not load .env; using environment variables");
        } else {
            info!("loaded configuration from .env");
        }
    }

    let config = match lib::ServerConfig::from_env() {
        Ok(config) => config,
        Err(error) => {
            error!(%error, "invalid server configuration");
            std::process::exit(1);
        }
    };
    config.log();

    info!("initializing WebRTC service");
    let webrtc_api = Arc::new(lib::build_webrtc_api(&config));
    let address = format!("0.0.0.0:{}", config.port);

    let shared_state = Arc::new(lib::AppState {
        peer_connections: Arc::new(RwLock::new(HashMap::new())),
        config: config.clone(),
        webrtc_api,
        start_time: SystemTime::now(),
    });

    tokio::spawn(lib::periodic_cleanup(Arc::clone(&shared_state)));

    if config.stun_enabled {
        let stun_address = format!("0.0.0.0:{}", config.stun_port);
        tokio::spawn(async move {
            if let Err(error) = lib::run_stun_server(&stun_address).await {
                error!(%error, %stun_address, "STUN server stopped unexpectedly");
            }
        });
    }

    let app = lib::setup_routes(Router::new()).with_state(Arc::clone(&shared_state));
    let listener = match tokio::net::TcpListener::bind(&address).await {
        Ok(listener) => listener,
        Err(error) => {
            error!(%error, %address, "failed to bind HTTP listener");
            std::process::exit(1);
        }
    };

    info!(%address, "packet-loss server listening");
    let result = axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await;

    lib::close_all_connections(&shared_state).await;

    if let Err(error) = result {
        error!(%error, "HTTP server stopped with an error");
        std::process::exit(1);
    }
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    info!("shutdown signal received");
}
