pipeline {
    agent {
        kubernetes {
            yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: buildah
      image: quay.io/buildah/stable:v1.35.4
      command:
        - cat
      tty: true
      volumeMounts:
        - name: jenkins-storage
          mountPath: /var/lib/containers
        - name: buildah-cache
          mountPath: /tmp/buildah-cache
        - name: tmp-storage
          mountPath: /tmp
      env:
        - name: BUILDAH_ISOLATION
          value: "chroot"
        - name: STORAGE_DRIVER
          value: "vfs"
        - name: BUILDAH_LAYERS
          value: "true"
        - name: XDG_RUNTIME_DIR
          value: "/tmp"
  volumes:
    - name: jenkins-storage
      persistentVolumeClaim:
        claimName: jenkins
    - name: buildah-cache
      emptyDir: {}
    - name: tmp-storage
      emptyDir: {}
"""
        }
    }

    environment {
        PROJECT_NAME = "gamma"
        OPENSHIFT_SERVER = "https://api.ocp.smartek.ae:6443"
        REGISTRY_CREDENTIALS = 'ce45edfb-ce9a-42be-aa16-afea0bdc5dfc'
        FRONTEND_IMAGE = "quay.io/bilelrifi/job-portal-frontend:p"
        BACKEND_IMAGE = "quay.io/bilelrifi/job-portal-backend:p"
    }

    stages {
        stage('Clone Repo') {
            steps {
                checkout scm
            }
        }

        stage('Setup Buildah Storage') {
            steps {
                container('buildah') {
                    sh '''
                        echo "Setting up Buildah storage and cache directories..."
                        CURRENT_USER=$(whoami)
                        CURRENT_UID=$(id -u)
                        CURRENT_GID=$(id -g)
                        echo "Running as user: $CURRENT_USER (UID: $CURRENT_UID, GID: $CURRENT_GID)"
                        
                        # Create storage directories with current user permissions
                        mkdir -p /var/lib/containers/storage
                        mkdir -p /tmp/buildah-cache/frontend
                        mkdir -p /tmp/buildah-cache/backend
                        
                        # Create home directory structure for rootless buildah
                        HOME_DIR="/tmp/buildah-home"
                        mkdir -p $HOME_DIR/.config/containers
                        mkdir -p $HOME_DIR/.local/share/containers
                        export HOME=$HOME_DIR
                        
                        echo "Configuring storage.conf for rootless operation..."
                        cat > $HOME_DIR/.config/containers/storage.conf << EOF
[storage]
driver = "vfs"
runroot = "/tmp/buildah-runtime"
graphroot = "/var/lib/containers/storage"

[storage.options]
mount_program = "/usr/bin/fuse-overlayfs"
EOF
                        
                        # Create runtime directory
                        mkdir -p /tmp/buildah-runtime
                        
                        echo "Storage setup complete"
                        export HOME=$HOME_DIR
                        buildah info
                    '''
                }
            }
        }

        stage('Build & Push to Quay') {
            parallel {
                stage('Frontend') {
                    steps {
                        container('buildah') {
                            withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                                sh '''
                                    # Set up environment for rootless buildah
                                    HOME_DIR="/tmp/buildah-home"
                                    export HOME=$HOME_DIR
                                    
                                    echo "Logging into Quay..."
                                    buildah login -u "$QUAY_USER" -p "$QUAY_PASS" quay.io

                                    echo "Building frontend image with layer caching (rootless)..."
                                    cd frontend
                                    
                                    # Use cache mount and enable layers for better caching
                                    buildah bud \
                                        --storage-driver=vfs \
                                        --layers \
                                        --cache-from=${FRONTEND_IMAGE} \
                                        --cache-to=type=local,dest=/tmp/buildah-cache/frontend \
                                        --cache-from=type=local,src=/tmp/buildah-cache/frontend \
                                        -t ${FRONTEND_IMAGE} .

                                    echo "Pushing frontend image..."
                                    buildah push --storage-driver=vfs ${FRONTEND_IMAGE}
                                '''
                            }
                        }
                    }
                }

                stage('Backend') {
                    steps {
                        container('buildah') {
                            withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                                sh '''
                                    # Set up environment for rootless buildah
                                    HOME_DIR="/tmp/buildah-home"
                                    export HOME=$HOME_DIR
                                    
                                    echo "Logging into Quay..."
                                    buildah login -u "$QUAY_USER" -p "$QUAY_PASS" quay.io

                                    echo "Building backend image with layer caching (rootless)..."
                                    cd backend
                                    
                                    # Use cache mount and enable layers for better caching
                                    buildah bud \
                                        --storage-driver=vfs \
                                        --layers \
                                        --cache-from=${BACKEND_IMAGE} \
                                        --cache-to=type=local,dest=/tmp/buildah-cache/backend \
                                        --cache-from=type=local,src=/tmp/buildah-cache/backend \
                                        -t ${BACKEND_IMAGE} .

                                    echo "Pushing backend image..."
                                    buildah push --storage-driver=vfs ${BACKEND_IMAGE}
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy from Quay') {
            steps {
                container('buildah') {
                    withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                        sh '''
                            echo "Deploying from Quay..."
                            oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                            oc project ${PROJECT_NAME}

                            oc delete all -l app=job-frontend --ignore-not-found=true
                            oc delete all -l app=job-backend --ignore-not-found=true

                            sleep 10

                            oc new-app ${FRONTEND_IMAGE} --name=job-frontend
                            oc expose svc/job-frontend

                            oc new-app ${BACKEND_IMAGE} --name=job-backend
                            oc expose svc/job-backend

                            oc get pods
                            oc get svc
                            oc get routes
                        '''
                    }
                }
            }
        }

        stage('Cleanup Old Cache') {
            steps {
                container('buildah') {
                    sh '''
                        echo "Cleaning up old cache entries to save space..."
                        # Keep only recent cache files in tmp storage
                        find /tmp/buildah-cache -type f -mtime +7 -delete 2>/dev/null || true
                        find /var/lib/containers/storage -name "*.tmp" -mtime +1 -delete 2>/dev/null || true
                        
                        # Show cache usage
                        du -sh /tmp/buildah-cache/ 2>/dev/null || echo "Cache directory not found yet"
                        du -sh /var/lib/containers/storage/ 2>/dev/null || echo "Storage directory not found yet"
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check the logs for details.'
        }
        always {
            script {
                try {
                    container('buildah') {
                        sh '''
                            echo "Build cache statistics:"
                            du -sh /tmp/buildah-cache/ 2>/dev/null || echo "No cache directory found"
                            echo "Storage statistics:"
                            du -sh /var/lib/containers/storage/ 2>/dev/null || echo "No storage directory found"
                        '''
                    }
                } catch (Exception e) {
                    echo "Could not collect cache statistics: ${e.getMessage()}"
                }
            }
        }
    }
}