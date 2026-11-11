fn main() {
    // Packaged assets are read by generate_context!. A frontend-only rebuild
    // must invalidate the native embed rather than reuse a previous UI.
    println!("cargo:rerun-if-changed=../dist");
    tauri_build::build()
}
