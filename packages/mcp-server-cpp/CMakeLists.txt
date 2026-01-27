cmake_minimum_required(VERSION 3.16)
project(cesium-mcp-wasm VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# FlatBuffers include directory (will be copied from sibling repo)
set(FLATBUFFERS_INCLUDE_DIR "${CMAKE_SOURCE_DIR}/include/flatbuffers")

# Generated headers directory
set(GENERATED_INCLUDE_DIR "${CMAKE_SOURCE_DIR}/include/generated")

# Source files
set(SOURCES
    src/mcp_server.cpp
    src/location_database.cpp
    src/json_rpc.cpp
    src/main.cpp
)

# Header files
set(HEADERS
    include/mcp_server.h
    include/location_database.h
    include/json_rpc.h
    include/cesium_commands.h
)

# Add executable
add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})

# Include directories
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${FLATBUFFERS_INCLUDE_DIR}
    ${GENERATED_INCLUDE_DIR}
)

# Emscripten-specific settings
if(EMSCRIPTEN)
    message(STATUS "Building for Emscripten (WebAssembly)")

    # Enable pthreads
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -pthread")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -pthread")

    # Emscripten link flags
    set_target_properties(${PROJECT_NAME} PROPERTIES
        SUFFIX ".js"
        LINK_FLAGS "\
            -s WASM=1 \
            -s MODULARIZE=1 \
            -s EXPORT_NAME='createMcpServer' \
            -s EXPORTED_FUNCTIONS='[\"_handleMessage\",\"_init\",\"_getToolDefinitions\",\"_resolveLocation\",\"_listLocations\",\"_setCameraState\",\"_getCameraTarget\",\"_malloc\",\"_free\"]' \
            -s EXPORTED_RUNTIME_METHODS='[\"ccall\",\"cwrap\",\"UTF8ToString\",\"stringToUTF8\",\"lengthBytesUTF8\",\"getValue\",\"setValue\"]' \
            -s ALLOW_MEMORY_GROWTH=1 \
            -s INITIAL_MEMORY=16777216 \
            -s MAXIMUM_MEMORY=268435456 \
            -s PTHREAD_POOL_SIZE=4 \
            -s PROXY_TO_PTHREAD=0 \
            -s ENVIRONMENT='web,worker' \
            -s FILESYSTEM=0 \
            -s NO_EXIT_RUNTIME=1 \
            -s ASSERTIONS=1 \
            -s STACK_SIZE=1048576 \
            --no-entry \
        "
    )

    # Create dist directory and output there
    file(MAKE_DIRECTORY "${CMAKE_SOURCE_DIR}/dist")
    set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/dist")
else()
    message(STATUS "Building for native (testing only)")

    # Native build for testing
    set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
endif()

# Optimization flags for release
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG")
set(CMAKE_CXX_FLAGS_DEBUG "-g -O0")

# Install targets
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION bin
)

# Install dist files for WASM
if(EMSCRIPTEN)
    install(FILES
        "${CMAKE_SOURCE_DIR}/dist/${PROJECT_NAME}.js"
        "${CMAKE_SOURCE_DIR}/dist/${PROJECT_NAME}.wasm"
        DESTINATION lib
    )
endif()
