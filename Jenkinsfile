pipeline {
    agent any

    environment {
        PROJECT_NAME = "jenkins"
        OPENSHIFT_SERVER = "https://api.ocp4.smartek.ae:6443"

        QUAY_CREDENTIALS_ID = 'ce45edfb-ce9a-42be-aa16-afea0bdc5dfc'
        OC_TOKEN_ID = 'oc-token-id'

        FRONTEND_IMAGE = "quay.io/bilelrifi/job-portal-frontend:${BUILD_NUMBER}"
        BACKEND_IMAGE = "quay.io/bilelrifi/job-portal-backend:${BUILD_NUMBER}"
    }

    stages {
        stage('Clone Repo') {
            steps {
                checkout scm
            }
        }

        stage('Login to OpenShift & Quay.io') {
            steps {
                withCredentials([string(credentialsId: "${OC_TOKEN_ID}", variable: 'OC_TOKEN'),
                                 usernamePassword(credentialsId: "${QUAY_CREDENTIALS_ID}", usernameVariable: 'QUAY_USER', passwordVariable: 'QUAY_PASS')]) {
                    sh '''
                        echo "Logging into OpenShift with token..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}
                        echo "Successfully logged in to project: ${PROJECT_NAME}"
                    '''
                }
            }
        }

        stage('Build and Push Frontend Image') {
            agent {
                kubernetes {
                    defaultContainer 'buildah'
                    yaml '''
                        apiVersion: v1
                        kind: Pod
                        spec:
                          serviceAccountName: jenkins
                          containers:
                          - name: buildah
                            image: quay.io/buildah/stable:latest
                            command: ['cat']
                            tty: true
                            securityContext:
                              privileged: true
                              runAsUser: 0
                            resources:
                              requests:
                                memory: "1Gi"
                                cpu: "500m"
                              limits:
                                memory: "3Gi"
                                cpu: "2"
                            env:
                            - name: STORAGE_DRIVER
                              value: overlay
                            volumeMounts:
                            - name: buildah-storage
                              mountPath: /var/lib/containers
                          volumes:
                          - name: buildah-storage
                            emptyDir: {}
                    '''
                }
            }
            steps {
                container('buildah') {
                    withCredentials([usernamePassword(credentialsId: "${QUAY_CREDENTIALS_ID}", usernameVariable: 'QUAY_USER', passwordVariable: 'QUAY_PASS')]) {
                        sh '''
                            echo "=== CHECKING FRONTEND STRUCTURE ==="
                            ls -la frontend/
                            
                            echo "Setting up buildah and registries..."
                            
                            # Create registries configuration directory
                            mkdir -p /etc/containers/registries.conf.d
                            
                            # Configure container registries for short name resolution
                            cat > /etc/containers/registries.conf << EOF
[registries.search]
registries = ['docker.io', 'quay.io', 'registry.access.redhat.com']

[registries.insecure]
registries = []

[registries.block]
registries = []
EOF
                            
                            # Set up short name aliases
                            cat > /etc/containers/registries.conf.d/000-shortnames.conf << EOF
[aliases]
"nginx" = "docker.io/library/nginx"
"node" = "docker.io/library/node"
"alpine" = "docker.io/library/alpine"
"ubuntu" = "docker.io/library/ubuntu"
"debian" = "docker.io/library/debian"
"centos" = "docker.io/library/centos"
"redis" = "docker.io/library/redis"
"postgres" = "docker.io/library/postgres"
"mysql" = "docker.io/library/mysql"
"mongo" = "docker.io/library/mongo"
EOF
                            
                            buildah login -u $QUAY_USER -p $QUAY_PASS quay.io
                            
                            # Check for Containerfile and potentially fix it
                            if [ -f "./frontend/Containerfile" ]; then
                                echo "Found Containerfile at ./frontend/Containerfile"
                                
                                # Create a temporary fixed Containerfile
                                echo "Creating fixed Containerfile with fully qualified image names..."
                                sed 's|FROM nginx:alpine|FROM docker.io/library/nginx:alpine|g; s|FROM node:|FROM docker.io/library/node:|g' ./frontend/Containerfile > ./frontend/Containerfile.fixed
                                
                                DOCKERFILE_PATH="./frontend/Containerfile.fixed"
                                BUILD_CONTEXT="./frontend"
                                
                                echo "=== CONTAINERFILE CONTENT ==="
                                cat $DOCKERFILE_PATH
                                echo "=== END CONTAINERFILE ==="
                            else
                                echo "ERROR: No Containerfile found in frontend directory!"
                                ls -la ./frontend/
                                exit 1
                            fi
                            
                            echo "Building frontend image with privileged buildah..."
                            echo "Using Containerfile: $DOCKERFILE_PATH"
                            echo "Using build context: $BUILD_CONTEXT"
                            
                            # Set build arguments for frontend
                            VITE_API_BASE_URL="http://job-backend-jenkins.apps.ocp4.smartek.ae"
                            
                            buildah bud \
                                --build-arg VITE_API_BASE_URL="$VITE_API_BASE_URL" \
                                --layers=false \
                                --force-rm \
                                --pull-always \
                                -f $DOCKERFILE_PATH \
                                -t ${FRONTEND_IMAGE} \
                                $BUILD_CONTEXT
                            
                            echo "Pushing frontend image to Quay.io..."
                            buildah push ${FRONTEND_IMAGE}
                        '''
                    }
                }
            }
        }
        
        stage('Build and Push Backend Image') {
            agent {
                kubernetes {
                    defaultContainer 'buildah'
                    yaml '''
                        apiVersion: v1
                        kind: Pod
                        spec:
                          serviceAccountName: jenkins
                          containers:
                          - name: buildah
                            image: quay.io/buildah/stable:latest
                            command: ['cat']
                            tty: true
                            securityContext:
                              privileged: true
                              runAsUser: 0
                            resources:
                              requests:
                                memory: "1Gi"
                                cpu: "500m"
                              limits:
                                memory: "3Gi"
                                cpu: "2"
                            env:
                            - name: STORAGE_DRIVER
                              value: overlay
                            volumeMounts:
                            - name: buildah-storage
                              mountPath: /var/lib/containers
                          volumes:
                          - name: buildah-storage
                            emptyDir: {}
                    '''
                }
            }
            steps {
                container('buildah') {
                    withCredentials([usernamePassword(credentialsId: "${QUAY_CREDENTIALS_ID}", usernameVariable: 'QUAY_USER', passwordVariable: 'QUAY_PASS')]) {
                        sh '''
                            echo "=== CHECKING BACKEND STRUCTURE ==="
                            ls -la backend/
                            
                            echo "Setting up buildah and registries..."
                            
                            # Create registries configuration directory
                            mkdir -p /etc/containers/registries.conf.d
                            
                            # Configure container registries
                            cat > /etc/containers/registries.conf << EOF
[registries.search]
registries = ['docker.io', 'quay.io', 'registry.access.redhat.com']

[registries.insecure]
registries = []

[registries.block]
registries = []
EOF
                            
                            # Set up short name aliases
                            cat > /etc/containers/registries.conf.d/000-shortnames.conf << EOF
[aliases]
"nginx" = "docker.io/library/nginx"
"node" = "docker.io/library/node"
"alpine" = "docker.io/library/alpine"
"ubuntu" = "docker.io/library/ubuntu"
"debian" = "docker.io/library/debian"
"python" = "docker.io/library/python"
EOF
                            
                            buildah login -u $QUAY_USER -p $QUAY_PASS quay.io

                            # Check for backend Containerfile
                            if [ -f "./backend/Containerfile" ]; then
                                echo "Found backend Containerfile at ./backend/Containerfile"
                                
                                # Create a temporary fixed Containerfile
                                echo "Creating fixed Containerfile with fully qualified image names..."
                                sed 's|FROM node:|FROM docker.io/library/node:|g; s|FROM alpine|FROM docker.io/library/alpine|g; s|FROM ubuntu|FROM docker.io/library/ubuntu|g; s|FROM debian|FROM docker.io/library/debian|g; s|FROM python:|FROM docker.io/library/python:|g' ./backend/Containerfile > ./backend/Containerfile.fixed
                                
                                DOCKERFILE_PATH="./backend/Containerfile.fixed"
                                BUILD_CONTEXT="./backend"
                                
                                echo "=== BACKEND CONTAINERFILE CONTENT ==="
                                cat $DOCKERFILE_PATH
                                echo "=== END CONTAINERFILE ==="
                            else
                                echo "ERROR: No backend Containerfile found!"
                                ls -la ./backend/
                                exit 1
                            fi

                            echo "Building backend image with privileged buildah..."
                            echo "Using Containerfile: $DOCKERFILE_PATH"
                            echo "Using build context: $BUILD_CONTEXT"
                            
                            buildah bud \
                                --layers=false \
                                --force-rm \
                                --pull-always \
                                -f $DOCKERFILE_PATH \
                                -t ${BACKEND_IMAGE} \
                                $BUILD_CONTEXT

                            echo "Pushing backend image to Quay.io..."
                            buildah push ${BACKEND_IMAGE}
                        '''
                    }
                }
            }
        }

        stage('Deploy Applications') {
            agent any
            steps {
                withCredentials([string(credentialsId: "${OC_TOKEN_ID}", variable: 'OC_TOKEN')]) {
                    sh '''
                        echo "Deploying applications to OpenShift from Quay.io..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}

                        # Clean up existing resources
                        oc delete all -l app=job-frontend --ignore-not-found=true
                        oc delete all -l app=job-backend --ignore-not-found=true

                        echo "Waiting for cleanup to complete..."
                        sleep 10

                        # Deploy frontend
                        echo "Deploying frontend..."
                        oc new-app ${FRONTEND_IMAGE} --name=job-frontend
                        oc expose svc/job-frontend

                        # Deploy backend  
                        echo "Deploying backend..."
                        oc new-app ${BACKEND_IMAGE} --name=job-backend
                        oc expose svc/job-backend

                        echo "Waiting for deployments..."
                        oc rollout status deployment/job-frontend --timeout=300s || echo "Frontend deployment timeout"
                        oc rollout status deployment/job-backend --timeout=300s || echo "Backend deployment timeout"

                        echo "Deployment completed successfully"
                        echo "Frontend route: $(oc get route job-frontend -o jsonpath='{.spec.host}' 2>/dev/null || echo 'Route not ready yet')"
                        echo "Backend route: $(oc get route job-backend -o jsonpath='{.spec.host}' 2>/dev/null || echo 'Route not ready yet')"
                        
                        # Show pod status
                        echo "=== POD STATUS ==="
                        oc get pods -l app=job-frontend -o wide || echo "Frontend pods not found"
                        oc get pods -l app=job-backend -o wide || echo "Backend pods not found"
                    '''
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline completed'
        }
        success {
            echo 'Pipeline succeeded!'
            echo 'Your applications should be accessible at:'
            echo 'Frontend: http://job-frontend-jenkins.apps.ocp4.smartek.ae'
            echo 'Backend: http://job-backend-jenkins.apps.ocp4.smartek.ae'
        }
        failure {
            echo 'Pipeline failed. Check logs for details.'
        }
    }
}