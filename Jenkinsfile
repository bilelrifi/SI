pipeline {
    agent any

    environment {
        PROJECT_NAME = "gamma"
        OPENSHIFT_SERVER = "https://api.ocp.smartek.ae:6443"

        REGISTRY_CREDENTIALS = 'ce45edfb-ce9a-42be-aa16-afea0bdc5dfc'

        FRONTEND_IMAGE = "quay.io/bilelrifi/job-portal-frontend:p"
        BACKEND_IMAGE = "quay.io/bilelrifi/job-portal-backend:p"

        PODMAN_COMPOSE_FILE = "podman-compose.yml"
    }

    stages {
        stage('Clone Repo') {
            steps {
                checkout scm
            }
        }

        stage('Login to OpenShift') {
            steps {
                withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                    sh '''
                        echo "Logging into OpenShift with token..."
                        echo "Token length: ${#OC_TOKEN}"
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}
                        echo "Successfully logged in and switched to project: ${PROJECT_NAME}"
                        oc whoami
                        oc project
                    '''
                }
            }
        }

        stage('Install podman and podman-compose') {
            steps {
                sh '''
                    echo 'Checking for podman installation...'
                    
                    # Check if podman is already installed
                    if command -v podman &> /dev/null; then
                        echo "Podman is already installed:"
                        podman --version
                    else
                        echo "Installing podman..."
                        
                        # Detect OS and install podman accordingly
                        if [ -f /etc/os-release ]; then
                            . /etc/os-release
                            echo "Detected OS: $NAME $VERSION"
                            
                            case "$ID" in
                                "rhel"|"centos"|"rocky"|"almalinux")
                                    echo "Installing podman on RHEL/CentOS-based system..."
                                    if command -v dnf &> /dev/null; then
                                        sudo dnf install -y podman
                                    else
                                        sudo yum install -y podman
                                    fi
                                    ;;
                                "fedora")
                                    echo "Installing podman on Fedora..."
                                    sudo dnf install -y podman
                                    ;;
                                "ubuntu"|"debian")
                                    echo "Installing podman on Ubuntu/Debian..."
                                    sudo apt-get update
                                    sudo apt-get install -y podman
                                    ;;
                                *)
                                    echo "Attempting generic installation..."
                                    if command -v dnf &> /dev/null; then
                                        sudo dnf install -y podman
                                    elif command -v yum &> /dev/null; then
                                        sudo yum install -y podman
                                    elif command -v apt-get &> /dev/null; then
                                        sudo apt-get update && sudo apt-get install -y podman
                                    else
                                        echo "ERROR: Unable to install podman automatically"
                                        echo "Please install podman manually on the Jenkins agent"
                                        exit 1
                                    fi
                                    ;;
                            esac
                        else
                            echo "Cannot detect OS. Attempting generic installation..."
                            if command -v dnf &> /dev/null; then
                                sudo dnf install -y podman
                            elif command -v yum &> /dev/null; then
                                sudo yum install -y podman
                            elif command -v apt-get &> /dev/null; then
                                sudo apt-get update && sudo apt-get install -y podman
                            else
                                echo "ERROR: Unable to install podman automatically"
                                exit 1
                            fi
                        fi
                        
                        echo "Podman installation complete:"
                        podman --version
                    fi
                    
                    echo 'Installing compatible podman-compose with Python 3.6...'

                    # Find a Python 3 executable
                    PYTHON_BIN=$(command -v python3 || true)

                    if [ -z "$PYTHON_BIN" ]; then
                        echo "ERROR: Python 3 binary not found in PATH."
                        echo "Please install Python 3 or add it to the system PATH."
                        exit 1
                    fi

                    echo "Using Python binary: $PYTHON_BIN"
                    $PYTHON_BIN --version

                    # Upgrade pip and install compatible version of podman-compose
                    $PYTHON_BIN -m pip install --upgrade --user pip
                    # Install version 1.0.6 which is compatible with Python 3.6
                    $PYTHON_BIN -m pip install --user "podman-compose==1.0.6"

                    echo "podman-compose installation complete."
                    
                    # Verify installation
                    export PATH=$HOME/.local/bin:$PATH
                    echo "Podman version:"
                    podman --version
                    echo "Podman-compose version:"
                    podman-compose --version
                '''
            }
        }

        stage('Build Frontend Image') {
            steps {
                sh '''
                    echo "Building frontend image using podman-compose..."
                    export PATH=$HOME/.local/bin:$PATH
                    echo "Current directory: $(pwd)"
                    echo "Checking if podman-compose.yml exists..."
                    ls -la podman-compose.yml
                    echo "Running podman-compose build frontend..."
                    podman-compose -f podman-compose.yml build frontend
                '''
            }
        }

        stage('Build Backend Image') {
            steps {
                sh '''
                    echo "Building backend image using podman-compose..."
                    export PATH=$HOME/.local/bin:$PATH
                    echo "Running podman-compose build backend..."
                    podman-compose -f podman-compose.yml build backend
                '''
            }
        }

        stage('Tag Images') {
            steps {
                sh """
                    echo "Images are already tagged in podman-compose.yml. Skipping manual tagging."
                """
            }
        }

        stage('Push to Quay.io') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                    sh """
                        export PATH=\$HOME/.local/bin:\$PATH
                        echo "Logging into Quay.io..."
                        podman login quay.io -u $QUAY_USER -p $QUAY_PASS
                        echo "Pushing frontend image to Quay.io..."
                        podman push ${FRONTEND_IMAGE}
                        echo "Pushing backend image to Quay.io..."
                        podman push ${BACKEND_IMAGE}
                    """
                }
            }
        }

        stage('Deploy Applications') {
            steps {
                withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                    sh """
                        echo "Deploying applications to OpenShift..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}

                        echo "Deleting existing frontend and backend resources (if any)..."
                        oc delete all -l app=job-frontend || true
                        oc delete all -l app=job-backend || true

                        echo "Creating new frontend application..."
                        oc new-app ${FRONTEND_IMAGE} --name=job-frontend
                        oc expose svc/job-frontend

                        echo "Creating new backend application..."
                        oc new-app ${BACKEND_IMAGE} --name=job-backend
                        oc expose svc/job-backend
                    """
                }
            }
        }
    }
}