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
        - sleep
      args:
        - '99d'
      volumeMounts:
        - name: jenkins-storage
          mountPath: /var/lib/containers
        - name: tmp-storage
          mountPath: /tmp
      env:
        - name: STORAGE_DRIVER
          value: "vfs"
        - name: BUILDAH_ISOLATION
          value: "chroot"
        - name: BUILDAH_LAYERS
          value: "true"
  volumes:
    - name: jenkins-storage
      persistentVolumeClaim:
        claimName: jenkins
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

        stage('Setup Buildah') {
            steps {
                container('buildah') {
                    sh '''
                        echo "Setting up Buildah environment..."
                        
                        # Get current user info
                        whoami
                        id
                        
                        # Create necessary directories
                        mkdir -p /var/lib/containers/storage
                        mkdir -p /tmp/cache
                        
                        # Set up buildah configuration
                        export STORAGE_DRIVER=vfs
                        export BUILDAH_ISOLATION=chroot
                        
                        echo "Testing buildah..."
                        buildah version
                        buildah info
                    '''
                }
            }
        }

        stage('Build & Push Images') {
            parallel {
                stage('Frontend') {
                    steps {
                        container('buildah') {
                            withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                                sh '''
                                    echo "Building frontend image..."
                                    
                                    # Login to registry
                                    buildah login -u "$QUAY_USER" -p "$QUAY_PASS" quay.io
                                    
                                    # Build with caching enabled
                                    cd frontend
                                    buildah build \
                                        --storage-driver=vfs \
                                        --layers \
                                        --tag ${FRONTEND_IMAGE} \
                                        .
                                    
                                    # Push image
                                    buildah push \
                                        --storage-driver=vfs \
                                        ${FRONTEND_IMAGE}
                                    
                                    echo "Frontend build complete"
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
                                    echo "Building backend image..."
                                    
                                    # Login to registry
                                    buildah login -u "$QUAY_USER" -p "$QUAY_PASS" quay.io
                                    
                                    # Build with caching enabled
                                    cd backend
                                    buildah build \
                                        --storage-driver=vfs \
                                        --layers \
                                        --tag ${BACKEND_IMAGE} \
                                        .
                                    
                                    # Push image
                                    buildah push \
                                        --storage-driver=vfs \
                                        ${BACKEND_IMAGE}
                                    
                                    echo "Backend build complete"
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy to OpenShift') {
            steps {
                container('buildah') {
                    withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                        sh '''
                            echo "Installing OpenShift CLI..."
                            # Download and install oc if not present
                            if ! command -v oc &> /dev/null; then
                                curl -L https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-linux.tar.gz | tar -xz -C /tmp
                                chmod +x /tmp/oc
                                export PATH=/tmp:$PATH
                            fi
                            
                            echo "Deploying to OpenShift..."
                            oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                            oc project ${PROJECT_NAME}

                            # Clean up existing deployments
                            oc delete all -l app=job-frontend --ignore-not-found=true
                            oc delete all -l app=job-backend --ignore-not-found=true

                            # Wait a moment for cleanup
                            sleep 10

                            # Deploy new applications
                            oc new-app ${FRONTEND_IMAGE} --name=job-frontend
                            oc expose svc/job-frontend

                            oc new-app ${BACKEND_IMAGE} --name=job-backend
                            oc expose svc/job-backend

                            # Show status
                            echo "Deployment status:"
                            oc get pods
                            oc get svc
                            oc get routes
                        '''
                    }
                }
            }
        }

        stage('Cache Cleanup') {
            steps {
                container('buildah') {
                    sh '''
                        echo "Cleaning up old cache..."
                        
                        # Clean old containers and images
                        buildah containers --format "{{.ContainerID}}" | head -n -5 | xargs -r buildah rm 2>/dev/null || true
                        buildah images --format "{{.ID}}" | head -n -10 | xargs -r buildah rmi 2>/dev/null || true
                        
                        # Show current storage usage
                        echo "Storage usage:"
                        du -sh /var/lib/containers/ 2>/dev/null || echo "No storage directory found"
                        
                        echo "Cleanup complete"
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
                            echo "Build statistics:"
                            buildah images 2>/dev/null || echo "No images found"
                            du -sh /var/lib/containers/ 2>/dev/null || echo "No storage directory found"
                        '''
                    }
                } catch (Exception e) {
                    echo "Could not collect build statistics: ${e.getMessage()}"
                }
            }
        }
    }
}